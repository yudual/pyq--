export interface User {
  id: string;
  email?: string;
  nickname: string;
  avatar: string;
  /** 服务端下发的邮箱头像 hash（公开接口不返回明文邮箱时使用） */
  avatarHash?: string;
  /** 该作者是否为站长（公开接口替代 email 比对的身份标记） */
  isOwner?: boolean;
  cover: string;
  bio: string;
}

export interface Comment {
  id: string;
  author: string;
  /** 评论者邮箱头像 hash（公开接口不返回明文邮箱） */
  avatarHash?: string;
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
  likes: Array<{ name: string; avatarHash?: string }>;
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
