/**
 * Frontmatter 解析与序列化工具
 * 支持 YAML 格式的元数据（title, category, tags, cover, excerpt, articleType, repostUrl, pinned, status, date）
 * 与各大成熟开源博客（Vdoing, Hexo, Halo, Ghost, Obsidian）的 frontmatter 规范完全对齐。
 */

export interface ArticleFrontmatter {
  title?: string;
  category?: string;
  tags?: string[];
  cover?: string;
  excerpt?: string;
  date?: string;
  articleType?: "original" | "repost" | "ai";
  repostUrl?: string;
  pinned?: boolean;
  status?: "published" | "draft";
  [key: string]: unknown;
}

/**
 * 从 Markdown 源码中解析 Frontmatter 和主体正文
 * 支持单行 tags: ["前端", "全栈"] 与多行列表：
 * tags:
 *   - 前端
 *   - 全栈
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: ArticleFrontmatter;
  content: string;
  hasFrontmatter: boolean;
  rawFrontmatter: string;
} {
  if (!markdown) {
    return { frontmatter: {}, content: "", hasFrontmatter: false, rawFrontmatter: "" };
  }

  // 匹配开头的 --- frontmatter ---（容忍 --- 后的空格或换行）
  const match = markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: {}, content: markdown, hasFrontmatter: false, rawFrontmatter: "" };
  }

  const rawYaml = match[1];
  const content = markdown.slice(match[0].length);
  const data: ArticleFrontmatter = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // 检查是否是多行列表项，例如 "  - tag1" 或 "- tag2"
    if (currentKey && currentArray && /^[-*]\s+/.test(trimmed)) {
      const itemVal = trimmed
        .replace(/^[-*]\s+/, "")
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
      if (itemVal) currentArray.push(itemVal);
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let valStr = trimmed.slice(colonIdx + 1).trim();

    // 如果当前行只有 "tags:" 并没有具体单行值，准备收集后续多行列表
    if (!valStr) {
      currentKey = key;
      currentArray = [];
      data[key] = currentArray;
      continue;
    } else {
      currentKey = null;
      currentArray = null;
    }

    // 去除引号并反转义转义字符，避免每次保存产生累加反斜杠 (\\\" -> \")
    if (valStr.startsWith('"') && valStr.endsWith('"')) {
      valStr = valStr.slice(1, -1).replace(/\\"/g, '"');
    } else if (valStr.startsWith("'") && valStr.endsWith("'")) {
      valStr = valStr.slice(1, -1).replace(/\\'/g, "'");
    }

    // 解析单行数组 [a, b, c]
    if (valStr.startsWith("[") && valStr.endsWith("]")) {
      const arr = valStr
        .slice(1, -1)
        .split(/[,，]/)
        .map((s) => s.trim().replace(/^["']|["']$/g, "").replace(/\\"/g, '"').replace(/\\'/g, "'"))
        .filter(Boolean);
      data[key] = arr;
      continue;
    }

    // 布尔值
    if (valStr === "true") {
      data[key] = true;
      continue;
    }
    if (valStr === "false") {
      data[key] = false;
      continue;
    }

    // 数字
    if (/^\d+(\.\d+)?$/.test(valStr)) {
      data[key] = Number(valStr);
      continue;
    }

    data[key] = valStr;
  }

  return {
    frontmatter: data,
    content,
    hasFrontmatter: true,
    rawFrontmatter: rawYaml,
  };
}

/**
 * 剥离开头的 Frontmatter YAML 块，返回纯正文（容忍开头的 BOM、空白、尾随空格与换行，并容忍未闭合截断的 frontmatter）
 */
export function stripFrontmatter(markdown: string): string {
  if (!markdown) return "";
  // 1. 标准多行 Frontmatter 闭合块
  const multiMatch = markdown.match(/^\uFEFF?[\s]*---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  if (multiMatch) {
    return markdown.slice(multiMatch[0].length);
  }
  // 2. 容错：被压缩成单行或被截断未闭合的 Frontmatter（如 --- title: ... --- 或 --- title: ...）
  const singleLineMatch = markdown.match(/^\uFEFF?[\s]*---[ \t]*(?:title|category|tags|cover|excerpt|articleType|repostUrl|pinned|status|date):[\s\S]*?(?:---(?:\r?\n|\s)|$)/i);
  if (singleLineMatch) {
    return markdown.slice(singleLineMatch[0].length);
  }
  return markdown;
}

/**
 * 彻底剥离 Frontmatter、HTML 标签、HTML 注释与 Markdown 标记，生成纯净文本
 * 用于文章卡片摘要、SEO meta description、字数统计与 RSS 输出
 */
export function stripMarkdownAndHtml(text: string): string {
  if (!text) return "";
  let clean = stripFrontmatter(text.trim());
  // 去除 HTML 注释 <!-- ... -->
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");
  // 去除未闭合或已闭合的代码块 (``` 与 ~~~)
  clean = clean.replace(/(?:```|~~~)[a-zA-Z0-9_-]*\r?\n[\s\S]*?(?:(?:```|~~~)|$)/g, "");
  clean = clean.replace(/```[\s\S]*?```/g, "");
  clean = clean.replace(/~~~[\s\S]*?~~~/g, "");
  // 去除行内代码 `code`
  clean = clean.replace(/`([^`]+)`/g, "$1");
  // 去除表格分割行 |---|---| 与表格边框管道符
  clean = clean.replace(/^\|?[\s-:]+\|[\s\-:|]+/gm, "");
  clean = clean.replace(/\|/g, " ");
  // 去除图片 ![alt](url)
  clean = clean.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  // 提取链接文本 [title](url) -> title
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // 去除 Callout 标记（如 > [!NOTE] ），保留同行的说明正文
  clean = clean.replace(/^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/gim, "");
  // 去除引用符号 >
  clean = clean.replace(/^>\s+/gm, "");
  // 去除标题符号 # ## ###
  clean = clean.replace(/^#{1,6}\s+/gm, "");
  // 去除无序与有序列表符号
  clean = clean.replace(/^(\s*[-*+]\s+|\s*\d+\.\s+)/gm, "");
  // 去除加粗/斜体/删除线
  clean = clean.replace(/[*~_]{1,3}([^*~_\n]+)[*~_]{1,3}/g, "$1");
  // 去除 HTML 标签与实体
  clean = clean
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  // 规范化多余空白
  clean = clean.replace(/\s+/g, " ").trim();
  // 兜底：如果清洗后依然残存 frontmatter 样式的头部（例如 --- title: ...），彻底抹除
  if (/^---\s*(?:title|category|tags|articleType):/i.test(clean)) {
    clean = clean.replace(/^---[\s\S]*?(?:---|$)/, "").trim();
  }
  return clean;
}

/**
 * 将元数据序列化为 YAML frontmatter 块
 */
export function stringifyFrontmatter(data: ArticleFrontmatter): string {
  const lines: string[] = ["---"];

  if (data.title) lines.push(`title: "${data.title.replace(/"/g, '\\"')}"`);
  if (data.date) lines.push(`date: ${data.date}`);
  if (data.category) lines.push(`category: ${data.category}`);
  if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
    lines.push(`tags: [${data.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`);
  }
  if (data.cover) lines.push(`cover: "${data.cover}"`);
  if (data.excerpt) lines.push(`excerpt: "${data.excerpt.replace(/"/g, '\\"')}"`);
  if (data.articleType) lines.push(`articleType: ${data.articleType}`);
  if (data.repostUrl) lines.push(`repostUrl: "${data.repostUrl}"`);
  if (typeof data.pinned === "boolean") lines.push(`pinned: ${data.pinned}`);
  if (data.status) lines.push(`status: ${data.status}`);

  // 保留任何其他自定义 frontmatter 字段
  const standardKeys = new Set([
    "title", "date", "category", "tags", "cover", "excerpt", "articleType", "repostUrl", "pinned", "status"
  ]);
  for (const [k, v] of Object.entries(data)) {
    if (!standardKeys.has(k) && v !== undefined && v !== null) {
      if (typeof v === "string") {
        lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
      } else if (typeof v === "boolean" || typeof v === "number") {
        lines.push(`${k}: ${v}`);
      } else if (Array.isArray(v)) {
        lines.push(`${k}: [${v.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(", ")}]`);
      }
    }
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * 确保正文带有（或更新）Frontmatter，并合并现有非标元数据以防丢失
 */
export function syncFrontmatterToMarkdown(
  currentMarkdown: string,
  updatedData: ArticleFrontmatter
): string {
  const { frontmatter: existing, content } = parseFrontmatter(currentMarkdown);
  const merged = { ...existing, ...updatedData };
  const yaml = stringifyFrontmatter(merged);
  return `${yaml}\n\n${content.replace(/^\n+/, "")}`;
}
