import crypto from "crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = ALPHABET.length;

export function generateShortId(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % BASE];
  }
  return result;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID_REGEX = /^[0-9A-Za-z]{8}$/;

export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isShortId(value: string): boolean {
  return SHORT_ID_REGEX.test(value);
}

/**
 * 从可能粘连了文本/标点的原始参数中提取纯净的 UUID 或 shortId
 * 解决移动端或社交软件分享时拼接文字导致查询失败的问题
 */
export function extractCleanId(value: string): string {
  if (!value) return value;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value).trim();
  } catch {
    decoded = value.trim();
  }
  const uuidMatch = decoded.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) return uuidMatch[0];
  const shortIdMatch = decoded.match(/^[0-9A-Za-z]{8}/);
  if (shortIdMatch) return shortIdMatch[0];
  return decoded;
}
