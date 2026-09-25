"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  User,
  BookOpen,
  Layers,
  ArrowRight,
  HardDrive,
  RefreshCw,
  HelpCircle,
  Globe,
  UploadCloud,
  Copy,
  Check,
} from "lucide-react";
import { apiFetch, getToken } from "@/lib/api-fetch";

interface StorageStatus {
  r2Configured: boolean;
  bucket: string;
  publicUrl: string;
  storageMode: "r2" | "external";
}

export default function AdminStorage() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const fetchStatus = () => {
    setLoading(true);
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch("/media/storage-status")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: StorageStatus) => setStatus(data))
      .catch(() => {
        setStatus({
          r2Configured: false,
          bucket: "",
          publicUrl: "",
          storageMode: "external",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const copyEnvSnippet = () => {
    const snippet = `R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=moment-media
R2_PUBLIC_URL=https://media.example.com
# R2_ENDPOINT=（可选，默认由 ACCOUNT_ID 自动计算）`;
    navigator.clipboard.writeText(snippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-adm-text">存储与图床设置</h2>
          <p className="mt-1 text-sm text-adm-text-secondary">
            图片存储架构解析、自有图床外链使用说明与全站个性化图片配置全景导航
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-adm-border bg-adm-card px-3 py-1.5 text-xs font-medium text-adm-text-secondary transition hover:bg-adm-card-hover hover:text-adm-text disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          刷新检测
        </button>
      </div>

      {/* 实时状态检测 Banner */}
      <section className="overflow-hidden rounded-2xl border border-adm-border bg-adm-card shadow-xs transition">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  status?.r2Configured
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                }`}
              >
                {status?.r2Configured ? <Cloud className="h-6 w-6" /> : <HardDrive className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-adm-text">
                    {status?.r2Configured ? "Cloudflare R2 私有存储：已连接" : "当前模式：自有图床 / 外链直连（零门槛）"}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      status?.r2Configured
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {status?.r2Configured ? "R2 直传已就绪" : "支持任意第三方图床外链"}
                  </span>
                </div>

                <p className="mt-1.5 text-sm leading-relaxed text-adm-text-secondary">
                  {status?.r2Configured
                    ? `系统已成功加载后端 R2 存储桶「${status.bucket}」，公开媒体域名为「${status.publicUrl}」。在全站支持一键上传图片/音频/视频至私有云，并在媒体素材库中统一归档。同时，任何输入框依然可以直接粘贴自有图床外链。`
                    : "您完全可以使用现有的图床（如七牛云、又拍云、阿里云 OSS、腾讯云 COS、自建 Chevereto、兰空图床、GitHub/jsDelivr 等）！无需在后端配置任何对象存储密钥，在博客各个图片输入框中直接粘贴 URL 即可。前端已支持全域图片自适应加载与自动优化。"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 状态补充细节栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-adm-border bg-adm-input/50 px-5 py-3 text-xs text-adm-text-secondary sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Next.js 通配图片代理：已放行所有合法域名（无跨域阻拦）
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
              全站图片字段：双轨支持（外链粘贴 + 存储直传）
            </span>
          </div>
          <Link
            href="/admin/media"
            className="inline-flex items-center gap-1 font-medium text-adm-primary hover:underline"
          >
            打开媒体素材库 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* 方案深度对比：自有图床 vs Cloudflare R2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 方案 1：自有图床 */}
        <section className="flex flex-col justify-between rounded-2xl border border-adm-border bg-adm-card p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-adm-text">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <Globe className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">方案一：自有图床 / 外部图片链接</h3>
            </div>
            <p className="text-xs leading-relaxed text-adm-text-secondary">
              适合已有独立图床或云厂商 OSS/COS 桶的用户，使用体验最为灵活，不依赖特定部署平台。
            </p>
            <ul className="space-y-1.5 text-xs text-adm-text-secondary">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span><strong>零后端配置</strong>：无需在 Vercel 或服务器设置任何存储环境变量。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span><strong>即粘即用</strong>：在后台头像、封面、背景轮播、文章插图输入框直接粘贴 <code className="rounded bg-adm-input px-1 py-0.5">https://...</code> 即可。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span><strong>CDN 自主掌控</strong>：图片分发速度由您的图床 CDN 决定，迁移博客数据时无存储耦合。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span><strong>注意事项</strong>：请确保图床允许博客域名跨域引用（未开启严格的防盗链白名单拦截）。</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 border-t border-adm-border pt-3">
            <span className="text-[11px] text-adm-text-tertiary">推荐用于：文章题图、个人头像、社交分享图、全站装饰图</span>
          </div>
        </section>

        {/* 方案 2：Cloudflare R2 */}
        <section className="flex flex-col justify-between rounded-2xl border border-adm-border bg-adm-card p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-adm-text">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <UploadCloud className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">方案二：Cloudflare R2 私有对象存储</h3>
            </div>
            <p className="text-xs leading-relaxed text-adm-text-secondary">
              适合希望在博客后台点击“上传图片”一键存到云端、并在媒体库集中管理素材的用户。
            </p>
            <ul className="space-y-1.5 text-xs text-adm-text-secondary">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span><strong>每月 10GB 免费空间</strong>：Cloudflare R2 永久提供每月 10GB 免费存储。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span><strong>零出网流量费</strong>：R2 最大特色是全球下载免流量费，彻底避免天价账单。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span><strong>受控预签名直传</strong>：大文件与视频由浏览器直传 R2，不受 Vercel 4.5MB 限制。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span><strong>全功能素材库</strong>：上传的所有媒体文件均登记至媒体素材库，可随时预览或删除。</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 border-t border-adm-border pt-3">
            <span className="text-[11px] text-adm-text-tertiary">推荐用于：后台一键上传本地照片、朋友圈实况 Live Photo、无损短视频</span>
          </div>
        </section>
      </div>

      {/* 全站个性化图片配置全景导航地图 */}
      <section className="rounded-2xl border border-adm-border bg-adm-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-adm-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-adm-primary" />
            <div>
              <h3 className="font-semibold text-adm-text">全站个性化图片配置全景地图</h3>
              <p className="text-xs text-adm-text-tertiary">
                系统所有图片配置项归纳速查，含推荐比例、规格说明与一键直达入口
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 类别 1: 站点形象与全局品牌 */}
          <div className="space-y-3 rounded-xl border border-adm-border/80 bg-adm-input/20 p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-adm-text">
                <Layers className="h-4 w-4 text-sky-500" />
                1. 站点形象与全局品牌
              </h4>
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-1 text-xs font-medium text-adm-primary hover:underline"
              >
                前往网站全局设置 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-adm-border/60 text-xs">
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">Favicon 网站图标</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">1:1 正方形 (32x32 / 128x128)</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">显示在浏览器标签页、移动端书签以及后台左上角 Logo。支持 PNG / SVG / ICO。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">OG 社交分享封面图</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">16:9 (推荐 1200x630)</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">在微信、QQ、X/Twitter 等聊天软件中分享博客主页链接时，展示的精美富媒体大卡片题图。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">桌面端背景装饰图</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">透明 PNG / 建议宽 600-800px</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">大屏幕桌面端两侧浮动展示的个性化装饰插画。留空时系统将展示极简微光动画。</p>
              </div>
            </div>
          </div>

          {/* 类别 2: 博主形象与 Hero 门面 */}
          <div className="space-y-3 rounded-xl border border-adm-border/80 bg-adm-input/20 p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-adm-text">
                <User className="h-4 w-4 text-emerald-500" />
                2. 博主形象与门面 Hero
              </h4>
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1 text-xs font-medium text-adm-primary hover:underline"
              >
                前往个人资料设置 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-adm-border/60 text-xs">
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">博主头像 (Avatar)</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">1:1 正方形 (建议 200x200+)</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">在首页 Hero 区、侧边栏、朋友圈个人主页与归档页展示。留空自动按管理员邮箱匹配 Cravatar 头像。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">主页封面大图 (Cover)</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">16:9 或 4:3 (建议 1920x1080)</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">朋友圈顶部的主封面横幅。如果配置了多张随机背景图库，首张图片会自动兼作主封面。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">随机背景轮播图库</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">支持任意多张横屏大图</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">每次访客进站或刷新网页时，顶部 Hero 封面都会随机切换展示一张不同壁纸，极具个性化。</p>
              </div>
            </div>
          </div>

          {/* 类别 3: 内容创作与展示 */}
          <div className="space-y-3 rounded-xl border border-adm-border/80 bg-adm-input/20 p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-adm-text">
                <BookOpen className="h-4 w-4 text-purple-500" />
                3. 内容创作频道配图
              </h4>
              <div className="flex gap-2">
                <Link
                  href="/admin/articles"
                  className="text-xs font-medium text-adm-primary hover:underline"
                >
                  文章
                </Link>
                <span className="text-adm-text-tertiary">·</span>
                <Link
                  href="/admin/projects"
                  className="text-xs font-medium text-adm-primary hover:underline"
                >
                  项目
                </Link>
                <span className="text-adm-text-tertiary">·</span>
                <Link
                  href="/admin/posts"
                  className="text-xs font-medium text-adm-primary hover:underline"
                >
                  动态
                </Link>
              </div>
            </div>
            <div className="divide-y divide-adm-border/60 text-xs">
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">文章封面图 (Article Cover)</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">16:9 (如 1200x675)</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">文章卡片与详情页顶部的题图。支持从正文自动提取第一张图，或直接填入图床外链。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">文章正文配图</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">Markdown 语法</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">在 Markdown 编辑器中直接输入 <code className="rounded bg-adm-input px-1 py-0.5">![描述](URL)</code>，支持居中排版与高清灯箱放大。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">项目封面与相册</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">16:9 或 4:3 截图/Logo</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">项目专区展示卡片封面；动态相册支持 1-9 宫格拼图与实况 Live Photo 动画播放。</p>
              </div>
            </div>
          </div>

          {/* 类别 4: 互动与媒体拓展 */}
          <div className="space-y-3 rounded-xl border border-adm-border/80 bg-adm-input/20 p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-adm-text">
                <ImageIcon className="h-4 w-4 text-amber-500" />
                4. 互动与媒体拓展
              </h4>
              <div className="flex gap-2">
                <Link
                  href="/admin/friends"
                  className="text-xs font-medium text-adm-primary hover:underline"
                >
                  友链
                </Link>
                <span className="text-adm-text-tertiary">·</span>
                <Link
                  href="/admin/media"
                  className="text-xs font-medium text-adm-primary hover:underline"
                >
                  素材库
                </Link>
              </div>
            </div>
            <div className="divide-y divide-adm-border/60 text-xs">
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">友情链接站点头像</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">1:1 正方形</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">友链列表展示的朋友网站头像。支持输入对方提供的外链 URL，或输入邮箱自动抓取。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">音乐唱片封面</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">1:1 正方形 (如 300x300)</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">全局悬浮音乐播放器、唱片旋转动画与歌单详情中的单曲封面。</p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-adm-text">媒体素材库 (Media)</span>
                  <span className="rounded bg-adm-input px-1.5 py-0.5 text-[10px] text-adm-text-secondary">集中管理中心</span>
                </div>
                <p className="mt-1 text-adm-text-secondary">集中浏览、一键复制外链地址以及清理管理所有已直传至 R2 的图片和媒体文件。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 常见问题与避坑指南 FAQ */}
      <section className="rounded-2xl border border-adm-border bg-adm-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-adm-border pb-3">
          <HelpCircle className="h-5 w-5 text-adm-text-tertiary" />
          <h3 className="font-semibold text-adm-text">图床与图片配置常见疑问 (FAQ)</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
          <div className="rounded-xl bg-adm-input/30 p-4">
            <h4 className="font-semibold text-adm-text">Q: 为什么我粘贴了自有图床链接，但图片无法加载或裂开？</h4>
            <p className="mt-1.5 leading-relaxed text-adm-text-secondary">
              A: 最常见的原因是图床开启了<strong>防盗链（Hotlink Protection）</strong>。许多商业图床默认禁止外部域名引用（Referer 不匹配返回 403 Forbidden）。
              <br />
              <strong>解决办法</strong>：登录您的图床控制台（如又拍云、七牛云、阿里云 OSS 等），将您的博客主站域名（如 <code className="rounded bg-adm-input px-1">example.com</code>）加入防盗链白名单，或勾选“允许空 Referer”。
            </p>
          </div>

          <div className="rounded-xl bg-adm-input/30 p-4">
            <h4 className="font-semibold text-adm-text">Q: 必须全部把所有图片都设置一遍吗？没设置会怎样？</h4>
            <p className="mt-1.5 leading-relaxed text-adm-text-secondary">
              A: 不需要，未设置的项会使用默认值：
              <br />
              • 博主头像留空：根据管理员邮箱抓取 Cravatar 头像；
              <br />
              • 桌面背景装饰图留空：仅显示背景色；
              <br />
              • 文章封面留空：自动提取文章正文中的第一张图片。按需设置即可。
            </p>
          </div>

          <div className="rounded-xl bg-adm-input/30 p-4">
            <h4 className="font-semibold text-adm-text">Q: 外链图片需要支持 HTTPS 吗？支持 HTTP 吗？</h4>
            <p className="mt-1.5 leading-relaxed text-adm-text-secondary">
              A: <strong>强烈建议使用 HTTPS 链接。</strong> 现代浏览器在安全 HTTPS 网页下会强制拦截非加密的 HTTP 外部图片（报 Mixed Content 警告导致无法显示）。请为您的图床绑定 SSL 证书。
            </p>
          </div>

          <div className="rounded-xl bg-adm-input/30 p-4">
            <h4 className="font-semibold text-adm-text">Q: 多张随机背景轮播图是怎么工作的？</h4>
            <p className="mt-1.5 leading-relaxed text-adm-text-secondary">
              A: 在【个人资料】中添加多张图片后，每当访客首次打开或刷新网页时，顶部封面都会随机选取其中一张进行展示，每次访问都有新惊喜。第一张图片会自动兼作为单图封面以保证全站兼容。
            </p>
          </div>
        </div>
      </section>

      {/* Cloudflare R2 进阶环境变量配置说明 */}
      <section className="rounded-2xl border border-adm-border bg-adm-card p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="font-semibold text-adm-text">Cloudflare R2 环境变量配置（可选）</h3>
              <p className="text-xs text-adm-text-tertiary">
                若希望启用后台“上传图片”一键直传至 R2，请在后端部署环境（如 Vercel Project Settings → Environment Variables）配置以下参数
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyEnvSnippet}
            className="inline-flex items-center gap-1 rounded-lg border border-adm-border bg-adm-input px-2.5 py-1 text-xs font-medium text-adm-text transition hover:bg-adm-card-hover"
          >
            {copiedEnv ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                复制模板
              </>
            )}
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-adm-input p-4 font-mono text-xs leading-6 text-adm-text">
          <div className="text-adm-text-secondary">
            # 存储密钥仅保存在后端环境变量中，绝不会明文写入网站数据库
          </div>
          <div>R2_ACCOUNT_ID=<span className="text-adm-text-tertiary">&lt;Cloudflare Account ID&gt;</span></div>
          <div>R2_ACCESS_KEY_ID=<span className="text-adm-text-tertiary">&lt;R2 API Token Access Key&gt;</span></div>
          <div>R2_SECRET_ACCESS_KEY=<span className="text-adm-text-tertiary">&lt;R2 API Token Secret Key&gt;</span></div>
          <div>R2_BUCKET=<span className="text-emerald-600 dark:text-emerald-400">moment-media</span></div>
          <div>R2_PUBLIC_URL=<span className="text-adm-primary">https://media.yourdomain.com</span></div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-adm-text-secondary">
          <p>
            * 前端与后端 R2_PUBLIC_URL 需完全一致，不要带末尾斜杠。R2 Bucket 请配置允许博客域名的 CORS 规则。
          </p>
          <a
            href="https://developers.cloudflare.com/r2/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-adm-primary hover:underline"
          >
            查看 Cloudflare R2 官方文档 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>
    </div>
  );
}
