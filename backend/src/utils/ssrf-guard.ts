import { promises as dns } from "dns";
import net from "net";

/**
 * SSRF 防护：校验目标 URL 是否为可公网访问的 http/https 地址。
 * 拒绝内网/链路本地/元数据地址（127.0.0.1、169.254.169.254、10.x、::1 等），
 * 包括通过域名解析到内网 IP 的情况。解析失败按私有处理（fail closed）。
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("无效的 URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("仅支持 http/https 协议");
  }
  if (parsed.username || parsed.password) {
    throw new Error("不支持携带凭据的 URL");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("不允许访问内网地址");
  }

  // IP 字面量直接检查；域名则解析后检查所有地址
  if (net.isIP(hostname)) {
    if (!isPublicIp(hostname)) throw new Error("不允许访问内网地址");
    return parsed;
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("域名解析失败");
  }
  if (records.length === 0 || records.some((r) => !isPublicIp(r.address))) {
    throw new Error("不允许访问内网地址");
  }
  return parsed;
}

function isPublicIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPublicIPv4(ip);
  if (family === 6) return isPublicIPv6(ip);
  return false;
}

function isPublicIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return false; // 本机/内网
  if (a === 169 && b === 254) return false; // 链路本地（含云元数据 169.254.169.254）
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16/12
  if (a === 192 && b === 168) return false; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return false; // 基准测试保留段
  if (a >= 224) return false; // 组播与保留段
  return true;
}

function isPublicIPv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  // IPv4-mapped ::ffff:a.b.c.d 按原 IPv4 规则判断
  const v4mapped = addr.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4mapped) return isPublicIPv4(v4mapped[1]);
  if (addr === "::" || addr === "::1") return false;

  let groups: string[];
  if (addr.includes("::")) {
    const [head, tail] = addr.split("::");
    if (addr.split("::").length > 2) return false;
    const headGroups = head ? head.split(":") : [];
    const tailGroups = tail ? tail.split(":") : [];
    const fill = 8 - headGroups.length - tailGroups.length;
    if (fill < 0) return false;
    groups = [...headGroups, ...Array(fill).fill("0"), ...tailGroups];
  } else {
    groups = addr.split(":");
  }
  if (groups.length !== 8) return false;

  const first = parseInt(groups[0], 16);
  if (Number.isNaN(first)) return false;
  if (first >= 0xfc00 && first <= 0xfdff) return false; // fc00::/7 唯一本地
  if (first >= 0xfe80 && first <= 0xfebf) return false; // fe80::/10 链路本地
  if (first >= 0xff00) return false; // ff00::/8 组播
  if (first === 0x2001 && parseInt(groups[1], 16) === 0x0db8) return false; // 文档保留段
  return true;
}
