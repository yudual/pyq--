export interface User {
  id: string;
  email?: string;
  nickname: string;
  avatar: string;
  cover: string;
  bio: string;
}

export interface Comment {
  id: string;
  author: string;
  email?: string;
  website?: string;
  replyTo?: string;
  /** 被回复评论的 ID（新数据有值，旧数据为空 — 需 fallback 到 replyTo author name 查找） */
  replyToId?: string;
  content: string;
  createdAt: string;
  /** 该评论的点赞数（文章详情页用） */
  likeCount?: number;
  /** 当前访客是否已点赞该评论 */
  meLiked?: boolean;
  /** 服务端标记：该评论是否由文章作者发布 */
  isAuthor?: boolean;
  /** 评论发布者的省份（IP 反查得到，仅显示用） */
  region?: string;
}

export interface PostMusic {
  name: string;
  artist: string;
  cover: string;
  url: string;
  source: "upload";
  /** LRC 歌词文本，由管理员手动编辑。 */
  lrc?: string;
  /** 进入文章详情页时是否自动播放此音乐 */
  autoplay?: boolean;
}

export interface LinkCard {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
}

export interface PostVideo {
  url?: string;
  cover?: string;
  title?: string;
  author?: string;
  avatar?: string;
  like?: number;
  time?: number;
  platform?: string;
  sourceUrl?: string;
  embedCode?: string;
  /** public CDN 可直连；proxy 需要后端代理；source-page 只能跳转原平台 */
  playback?: "direct" | "proxy" | "source-page";
  source: "parse" | "upload" | "url" | "embed";
}

export interface PostDouban {
  title: string;
  cover: string;
  link: string;
  rating: number;
  intro: string;
  status: string;
  statusLabel: string;
}

export interface PostLocation {
  name: string;
  city: string;
  province?: string;
  address?: string;
  lng?: number;
  lat?: number;
}

// PostImage = 普通图片(string) 或 实况图对象 { src, video? }
// 旧数据 images: string[] 仍兼容；新数据可含实况图对象
export type PostImage = string | { src: string; video?: string };

export interface Post {
  id: string;
  shortId?: string;
  /** moment=朋友圈动态（默认），article=长文章，project=项目作品，collection=系列合辑 */
  type?: "moment" | "article" | "project" | "collection";
  /** 文章标题 */
  title?: string;
  /** 文章摘要 / 朋友圈配文（article 类型：显示在卡片上方的动态文字；collection 类型：合辑导读） */
  excerpt?: string;
  /** 文章封面图 URL */
  cover?: string;
  /** 文章分类 */
  category?: string;
  /** 发帖省份（IP 解析简称，如"湖北"） */
  region?: string;
  /** 文章类型：original=原创，repost=转载，ai=AI生成 */
  articleType?: "original" | "repost" | "ai";
  /** 转载来源链接（articleType=repost 时填写） */
  repostUrl?: string;
  author: User;
  content: string;
  images: PostImage[];
  location?: PostLocation | null;
  music?: PostMusic | null;
  linkCard?: LinkCard | null;
  video?: PostVideo | null;
  douban?: PostDouban | null;
  pinned?: boolean;
  likesDisabled?: boolean;
  commentsDisabled?: boolean;
  createdAt: string;
  likes: Array<{ name: string; email?: string }>;
  comments: Comment[];
  /** 当前访客是否已点赞（基于 IP/email/userId 判断，跨浏览器同 IP 一致） */
  meLiked?: boolean;
  /** 阅读量（文章详情页客户端 fetch ?view=1 时递增） */
  viewCount?: number;
  /** 发布状态：published=已发布，draft=草稿 */
  status?: "published" | "draft";
  /** 所属合辑 ID */
  collectionId?: string | null;
  /** 所属合辑标题（在文章卡片显示徽标） */
  collectionTitle?: string | null;
  /** 所属合辑简略信息 */
  collection?: { id: string; shortId?: string; title: string } | null;
  /** 是否在首页隐藏 */
  hideInHome?: boolean;
  /** 若自身是合辑，包含的子文章有序 ID 列表 */
  collectionPostIds?: string[] | null;
  /** 若自身是合辑，包含的子文章完整数据 */
  collectionArticles?: Array<{
    id: string;
    shortId?: string;
    title: string;
    excerpt?: string;
    cover?: string;
    category?: string;
    articleType?: "original" | "repost" | "ai";
    viewCount?: number;
    createdAt?: string;
  }>;
  /** 文章详情页所属合辑上下文导航 */
  collectionContext?: {
    collectionId: string;
    collectionShortId?: string;
    collectionTitle: string;
    posts: Array<{ id: string; shortId?: string; title: string; order: number; isCurrent: boolean }>;
    currentIndex: number;
    total: number;
    prevPost?: { id: string; shortId?: string; title: string } | null;
    nextPost?: { id: string; shortId?: string; title: string } | null;
  } | null;
}

export const owner: User = {
  id: "u1",
  nickname: "小予",
  avatar: "/avatar-owner.svg",
  cover: "https://picsum.photos/seed/momentscover/1200/600",
  bio: "这是一个朋友圈博客程序",
};

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function daysAgo(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString();
}

export const posts: Post[] = [
  // 1. 深度长文文章
  {
    id: "post-art-1",
    shortId: "digital-garden",
    type: "article",
    category: "文章",
    title: "从零构筑一座数字花园：在碎片化时代重拾专注与自我沉淀",
    excerpt: "比起随处可见的信息洪流，我更想要一个只属于自己的小角落。在这里，思考不必为了讨好算法，生活也不需要迎合谁的期待。",
    cover: "https://picsum.photos/seed/garden88/800/500",
    author: owner,
    content: `
      <p>在这个被算法推荐和碎片短视频填满的时代，我们每天被动接收海量的信息，却常常在深夜关掉屏幕时感到前所未有的空虚。我常常问自己：上一次安安静静读完一本书、写下一篇完整的思考，是在什么时候？</p>
      <h2>一、为什么我们需要一座「数字花园」？</h2>
      <p>传统的社交媒体像是一条永不停歇的高速公路，每条动态的寿命不过几个小时，然后就被更新的浪潮淹没。而「数字花园」则截然不同——它是一个慢下来的地方，像真实的植物一样，这里的文字可以慢慢生长、修剪和发芽。</p>
      <p>在这里，我不必担心排版是否迎合爆款逻辑，也不用在意有没有成百上千的点赞。它首先属于我自己，记录我的灵感碎片、代码折腾、读过的书与看过的动漫。</p>
      <blockquote>灵感就像清晨草叶上的露珠，如果不及时收纳在自己的容器里，太阳一出来就会蒸发得无影无踪。</blockquote>
      <h2>二、慢节奏生活的治愈力</h2>
      <p>生活本身的质感往往藏在那些不起眼的细节里：下班路上吹过的晚风、煮咖啡时升起的热气、偶然听到的一首老歌。当我们开始认真记录这些微小的瞬间，原本平淡无奇的日子也会悄然变得立体而丰盈。</p>
      <h2>三、写在最后</h2>
      <p>希望来到这里的每一位朋友，都能在这个安静的角落里放慢脚步，找到片刻属于自己的宁静。愿我们都能在这个喧嚣的世界里，守住自己心中的那片小天地。</p>
    `,
    images: [],
    createdAt: hoursAgo(3),
    likes: [{ name: "CC" }, { name: "雁七" }, { name: "Kam" }, { name: "小明" }],
    comments: [
      {
        id: "c101",
        author: "CC",
        content: "很赞同这句‘灵感就像清晨的露珠’，个人主页确实该多一些这种安静的文字！",
        createdAt: hoursAgo(2),
      },
      {
        id: "c102",
        author: "雁七",
        content: "排版非常舒服，看得很享受～期待下一篇更新！",
        createdAt: hoursAgo(1),
      },
    ],
    viewCount: 256,
  },

  // 2. 独立项目展示
  {
    id: "post-proj-1",
    shortId: "minimark-app",
    type: "moment",
    category: "项目",
    author: owner,
    title: "MiniMark 极简本地优先写作卡片",
    cover: "https://picsum.photos/seed/minimarkcover/1200/600",
    content: "🛠️ 【独立折腾】发布了一款极简本地优先写作卡片工具「MiniMark」\n\n利用几周的周末时间，把一直想做的轻量卡片工具实现了出来：\n✦ 零账号体系，纯本地 SQLite/LocalStorage 离线加密存储\n✦ 极简双栏布局，毫秒级 Markdown 实时解析与大纲自动生成\n✦ 支持生成类似拍立得风格的分享卡片与长图\n\n纯粹为自己写作打造，告别臃肿，只留专注。代码已在 GitHub 开源，欢迎体验与交流～",
    images: [],
    linkCard: {
      url: "https://github.com/yudual",
      title: "MiniMark: Minimalist Local-First Writing Cards",
      description: "轻量、纯粹、无干扰的个人灵感卡片与写作空间",
      image: "https://picsum.photos/seed/minimarkcover/1200/600",
      siteName: "GitHub",
    },
    location: {
      name: "独立工作室",
      city: "深夜敲代码",
    },
    createdAt: hoursAgo(12),
    likes: [{ name: "Kam" }, { name: "本牛千智" }, { name: "CC" }],
    comments: [
      {
        id: "c201",
        author: "Kam",
        content: "界面质感很高级！卡片导出效果太赞了！",
        createdAt: hoursAgo(10),
      },
      {
        id: "c202",
        author: "本牛千智",
        content: "请问开源地址在哪？想给个 star！",
        createdAt: hoursAgo(8),
      },
      {
        id: "c203",
        author: "小予",
        replyTo: "本牛千智",
        content: "直接点上面的卡片就可以跳转 GitHub 啦～",
        createdAt: hoursAgo(6),
      },
    ],
  },

  // 3. 岁岁念 · 动漫感悟
  {
    id: "post-mom-1",
    shortId: "frieren-thoughts",
    type: "moment",
    category: "岁岁念",
    author: owner,
    content: "最近重温完《葬送的芙莉莲》，再次被这种克制而深刻的情绪打动。\n\n时间对于长寿的精灵而言是弹指一挥，但正是那些看似漫不经心的同行旅程，在往后数百年的回溯中构成了最耀眼的光。我们总在年轻时以为一切都来日方长，却往往在告别之后才真正理解某个人、某句话的重量。\n\n「既然如此，那就从现在开始去了解吧。」—— 很喜欢这句台词，温柔且充满力量。",
    images: [
      "https://picsum.photos/seed/animeart1/600/600",
      "https://picsum.photos/seed/coffeeview1/600/600",
    ],
    location: {
      name: "街角书店",
      city: "咖啡香里",
    },
    createdAt: daysAgo(1),
    likes: [{ name: "雁七" }, { name: "CC" }, { name: "DD" }, { name: "lcc" }],
    comments: [
      {
        id: "c301",
        author: "雁七",
        content: "“了解别人的旅行”真的很触动人，每一集的配乐也是神仙级别！",
        createdAt: daysAgo(1),
      },
    ],
  },

  // 4. 岁岁念 · 连载小说 / 故事断章
  {
    id: "post-mom-2",
    shortId: "station-four",
    type: "moment",
    category: "岁岁念",
    author: owner,
    content: "📖 【小说断章 · 第四号观测站的黄昏】\n\n“气压表上的红色指针在黄昏六点一刻准时颤抖了一下。老林放下手里的铝制水壶，推开了厚重的铁皮窗。风从戈壁滩的尽头吹过来，夹杂着粗糙的沙粒与某种极淡的金属气味。\n\n观测塔已经三年没有接收到总部的回信了。但老林依然每天雷打不动地校准射电天线。他说：‘宇宙那么大，电波走得慢一点是理所当然的。我在这里等它，它总会来的。’\n\n地平线尽头的晚霞如同一场盛大的熔金。”\n\n—— 随手敲的一小段，偶尔放飞脑洞写故事真的非常解压。",
    images: [
      "https://picsum.photos/seed/desert-sunset/800/500",
    ],
    createdAt: daysAgo(2),
    likes: [{ name: "Kam" }, { name: "CC" }],
    comments: [
      {
        id: "c401",
        author: "CC",
        content: "好有科幻电影既视感！老林后来收到回信了吗？求继续写！",
        createdAt: daysAgo(2),
      },
    ],
  },

  // 5. 第二篇深度长文
  {
    id: "post-art-2",
    shortId: "minimalist-design",
    type: "article",
    category: "文章",
    title: "给个人主页做减法：关于极简质感与液态玻璃设计的思考",
    excerpt: "当页面堆满复杂的动效与边框，访客往往找不到视线的焦点。设计中最难的不是做加法，而是克制地留白与呼应。",
    cover: "https://picsum.photos/seed/cleanui/800/500",
    author: owner,
    content: `
      <p>在设计这次的主页重构方案时，我一度尝试过许多酷炫的 3D 卡片、陀螺仪摇晃和悬浮粒子特效。但反复看上几天之后，发现这种强烈的视觉刺激很快就会让人感到疲劳。</p>
      <h2>一、去掉视觉噪音，回归阅读体验</h2>
      <p>真正耐看的设计，往往是安静且具有呼吸感的。全宽的液态毛玻璃顶栏、轻盈的边缘阴影过渡、克制的圆角卡片，这些细节不喧宾夺主，而是为核心文字与图文内容服务。</p>
      <h2>二、内容与形式的平衡</h2>
      <p>一个好的个人主页，第一眼应该让访客迅速感受到主人的气质与审美，接着自然而然地引导访客探索深度的长文或者有趣的日常碎片。</p>
      <p>生活需要留白，网页设计也是一样。少即是多，慢下来才走得更远。</p>
    `,
    images: [],
    createdAt: daysAgo(3),
    likes: [{ name: "DD" }, { name: "Kam" }, { name: "本牛千智" }],
    comments: [],
    viewCount: 189,
  },

  // 6. 岁岁念 · 日常抓拍与生活琐碎
  {
    id: "post-mom-3",
    shortId: "orange-sunset",
    type: "moment",
    category: "岁岁念",
    author: owner,
    content: "今日份傍晚的天空像打翻的橘子果酱🍊！\n\n路过公园买了一杯热拿铁，坐在长椅上吹了半小时晚风。看着树影被夕阳拉得很长，突然觉得生活里那些焦虑的小事好像也没什么大不了的。明天也要元气满满～",
    images: [
      "https://picsum.photos/seed/orangesky1/400/400",
      "https://picsum.photos/seed/orangesky2/400/400",
      "https://picsum.photos/seed/coffeehand/400/400",
    ],
    location: {
      name: "滨江公园长椅",
      city: "日落时分",
    },
    createdAt: daysAgo(4),
    likes: [{ name: "CC" }, { name: "雁七" }],
    comments: [
      {
        id: "c601",
        author: "雁七",
        content: "好惬意的日落！这个天空颜色太绝了",
        createdAt: daysAgo(4),
      },
    ],
  },

  // 7. 独立作品项目展示
  {
    id: "post-proj-2",
    shortId: "dual-blog",
    type: "moment",
    category: "项目",
    author: owner,
    title: "Dual Blog 个人朋友圈博客系统",
    cover: "https://picsum.photos/seed/cleanui/1200/600",
    content: "🚀 【开源发布】Dual Blog 个人朋友圈博客系统\n\n以「微信朋友圈」交互为灵魂，重新定义个人写作与记录：\n✦ 深度长文与朋友圈碎碎念双模共存\n✦ 原生暗黑液态玻璃拟态质感与全响应式布局\n✦ 内置豆瓣书影音挂载与无损音乐流直连播放\n\n探索属于每个人的独立数字花园与慢思考空间。",
    images: [],
    linkCard: {
      url: "https://github.com/yudual/pyq--",
      title: "Dual Blog - Modern WeChat Moments Personal Blog",
      description: "现代、极简、温润的个人朋友圈动态与文章聚合博客系统",
      image: "https://picsum.photos/seed/cleanui/1200/600",
      siteName: "GitHub",
    },
    location: {
      name: "开源工坊",
      city: "数字花园",
    },
    createdAt: daysAgo(5),
    likes: [{ name: "CC" }, { name: "雁七" }, { name: "Kam" }],
    comments: [
      {
        id: "c204",
        author: "CC",
        content: "朋友圈和博客的结合太有创意了，非常丝滑！",
        createdAt: daysAgo(5),
      },
    ],
  },
];

export const sampleArticles: Post[] = posts.filter((p) => p.type === "article");
export const sampleProjects: Post[] = posts.filter((p) => p.category === "项目" || p.type === "project");
export const sampleMoments: Post[] = posts.filter((p) => p.type !== "article" && p.category !== "项目");


/**
 * 时区安全的时间格式化工具。
 *
 * 问题：new Date(iso).getHours() 等方法使用运行环境的本地时区。
 * SSR (Next.js 服务器) 默认 UTC，而用户浏览器是 UTC+8，
 * 导致同一时间戳在服务端和客户端渲染出不同结果，
 * 引发 hydration mismatch 和 ISR 缓存页面时间错误。
 *
 * 解决：使用 Intl.DateTimeFormat 指定 timeZone: "Asia/Shanghai"，
 * 确保服务端和客户端始终输出中国时间。
 */
const CST_TIMEZONE = "Asia/Shanghai";

interface CSTDateParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
}

function getCSTParts(iso: string): CSTDateParts {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return { year: 1970, month: 1, day: 1, hour: 0, minute: 0 };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CST_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value || "0";

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24, // 24:00 → 0
    minute: parseInt(get("minute"), 10),
  };
}

export function formatWeChatDate(iso: string): string {
  const p = getCSTParts(iso);
  return `${p.year}年${p.month}月${p.day}日`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "刚刚";
  if (diffHour < 1) return `${diffMin}分钟前`;
  if (diffDay < 1) return `${diffHour}小时前`;
  if (diffDay === 1) return "昨天";
  if (diffDay < 3) return `${diffDay}天前`;

  const p = getCSTParts(iso);
  return `${p.year}年${p.month}月${p.day}日`;
}

/**
 * 完整发布时间格式（精确到分）：YYYY-MM-DD HH:mm，如 "2026-09-17 13:40"
 * 杜绝只展示模糊的“几分钟前”、“几天前”，让访客与博主明确获知真实发布时间。
 */
export function formatExactDateTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = getCSTParts(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * 详情页动态时间格式：显示完整清晰的发布日期与时间
 * 如 "2026-09-17 13:40"
 */
export function formatDetailTime(iso: string): string {
  return formatExactDateTime(iso);
}

/** 文章详情页时间格式：始终完整日期 "2026年2月11日 15:13"（不显示今天/昨天） */
export function formatArticleTime(iso: string): string {
  const p = getCSTParts(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * 将 ISO 日期字符串或 Date 转换为北京时间 CST (+08:00) 的 datetime-local 控件格式（YYYY-MM-DDTHH:mm）
 */
export function toDateTimeLocal(input?: string | Date): string {
  if (input === undefined || input === null || input === "") {
    const p = getCSTParts(new Date().toISOString());
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
  }
  const iso = typeof input === "string" ? input : input.toISOString();
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = getCSTParts(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * 将 datetime-local 字符串按 CST 时区 (+08:00) 安全解析为标准 ISO 8601 UTC 字符串，若无效则返回 undefined
 */
export function toIsoDateString(val?: string | Date): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val.toISOString();
  }
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split("T");
  if (parts.length !== 2) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const [datePart, timePart] = parts;
  const normalizedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
  const isoWithOffset = `${datePart}T${normalizedTime}+08:00`;
  const d = new Date(isoWithOffset);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** 别名导出，确保语义明确一致 */
export const parseDateTimeLocalToISO = toIsoDateString;

const VIDEO_PLATFORM_LABELS: Record<string, string> = {
  douyin: "抖音",
  kuaishou: "快手",
  xhs: "小红书",
  weibo: "微博",
  bilibili: "哔哩哔哩",
  upload: "本地上传",
  url: "链接",
  embed: "嵌入视频",
};

/** 根据动态的媒体内容返回"来自XXX"的平台标签 */
export function getPostSourceLabel(post: Post): string | null {
  if (post.type === "article") return "文章";
  if (post.video) {
    const p = post.video.platform;
    if (p && VIDEO_PLATFORM_LABELS[p]) return VIDEO_PLATFORM_LABELS[p];
    if (post.video.source === "upload") return "本地上传";
    if (post.video.source === "parse") return "视频平台";
    return "视频";
  }
  if (post.music) return null;
  return null;
}

/**
 * 评论时间格式：月日 + 时分（不带今天/昨天，不带年份）
 * 例："1月9日 01:33"
 */
export function formatCommentTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const defaultAboutContent = `
<h2>你好，我是 Dual 👋</h2>
<p>欢迎来到我的个人自留地。这里是我记录生活切片、折腾技术作品与沉淀文字的地方。</p>
<h3>🌱 关于这个小站</h3>
<p>网站以「个人主页为主，生活动态与随笔为辅」构建。顶部全宽液态毛玻璃导航栏串联起我的不同频道：</p>
<ul>
  <li><strong>文章</strong>：深度的长文写作、技术反思与生活哲学；</li>
  <li><strong>项目</strong>：业余时间捣鼓的独立开发作品与灵感产物；</li>
  <li><strong>岁岁念</strong>：像微信朋友圈一样轻松的生活日常、连载小说段落、动漫感悟与摄影抓拍。</li>
</ul>
<h3>☕ 兴趣与日常</h3>
<p>喜欢看动漫（特别喜欢《葬送的芙莉莲》这类沉静温柔的叙事）、尝试写科幻小说断章、偶尔喝一杯手冲咖啡，在傍晚的晚风里散步。</p>
<p>如果你也碰巧路过这里，欢迎在下方的评论区打个招呼～</p>
`;
