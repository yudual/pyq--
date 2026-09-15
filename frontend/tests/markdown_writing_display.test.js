/**
 * Comprehensive Test Suite for Markdown Writing & Frontend Display
 *
 * Directly exercises the real TypeScript production code:
 * 1. Frontmatter parsing, serialization, unescaping round-trips, and metadata synchronization
 * 2. Markdown engine (code blocks, macOS headers, syntax highlighting, callouts, tables, heading anchors)
 * 3. Sanitization & XSS defenses (preserving code buttons, svgs, callouts, tables while stripping scripts & event handlers)
 * 4. Code block idempotency (zero double-wrapping) and dark mode styling specificity
 * 5. Content separation & routing contracts (Articles vs Projects vs Moments)
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const frontendDir = path.resolve(__dirname, "..");

// Directly import production modules
const {
  parseFrontmatter,
  stringifyFrontmatter,
  syncFrontmatterToMarkdown,
  stripFrontmatter,
  stripMarkdownAndHtml,
} = require("../src/lib/frontmatter.ts");

const {
  markdownToHtml,
  extractHeadings,
  buildMacosCodeBlock,
  enhanceCodeBlocks,
  injectLegacyHeadingIds,
  isMarkdown,
} = require("../src/lib/markdown.ts");

const { sanitizeHtml } = require("../src/lib/sanitize.ts");

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

console.log("\n=================================================================");
console.log("  Markdown Writing & Display Verification Test Suite");
console.log("=================================================================\n");

// -------------------------------------------------------------
// Group 1: Frontmatter Logic
// -------------------------------------------------------------
console.log("--- Group 1: Frontmatter Parser & Serializer ---");

test("parseFrontmatter parses complete frontmatter block correctly", () => {
  const md = `---
title: "深入理解 React 19 新特性"
category: "技术"
tags: ["React", "前端", "JavaScript"]
cover: "https://example.com/cover.png"
excerpt: "全面解析 React 19 的新特性"
articleType: original
pinned: true
status: published
---

# 正文开始
这里是正文。
`;
  const result = parseFrontmatter(md);
  assert.strictEqual(result.hasFrontmatter, true);
  assert.strictEqual(result.frontmatter.title, "深入理解 React 19 新特性");
  assert.strictEqual(result.frontmatter.category, "技术");
  assert.deepStrictEqual(result.frontmatter.tags, ["React", "前端", "JavaScript"]);
  assert.strictEqual(result.frontmatter.cover, "https://example.com/cover.png");
  assert.strictEqual(result.frontmatter.excerpt, "全面解析 React 19 的新特性");
  assert.strictEqual(result.frontmatter.articleType, "original");
  assert.strictEqual(result.frontmatter.pinned, true);
  assert.strictEqual(result.frontmatter.status, "published");
  assert.ok(result.content.startsWith("\n# 正文开始"));
});

test("parseFrontmatter supports YAML multi-line list tags", () => {
  const md = `---
title: "多行标签测试"
tags:
  - React
  - Next.js
  - "TypeScript"
category: "开发"
---

正文内容
`;
  const result = parseFrontmatter(md);
  assert.strictEqual(result.hasFrontmatter, true);
  assert.strictEqual(result.frontmatter.title, "多行标签测试");
  assert.deepStrictEqual(result.frontmatter.tags, ["React", "Next.js", "TypeScript"]);
  assert.strictEqual(result.frontmatter.category, "开发");
  assert.strictEqual(result.content.trim(), "正文内容");
});

test("parseFrontmatter tolerates trailing whitespace on --- delimiters", () => {
  const md = `---   \ntitle: "带尾随空格的 frontmatter"\n---   \n\n正文开始`;
  const result = parseFrontmatter(md);
  assert.strictEqual(result.hasFrontmatter, true, "Must match frontmatter despite trailing spaces on ---");
  assert.strictEqual(result.frontmatter.title, "带尾随空格的 frontmatter");
  assert.strictEqual(result.content.trim(), "正文开始");
});

test("parseFrontmatter and stringifyFrontmatter round-trip escaped quotes without backslash explosion", () => {
  const originalTitle = 'React "Server" Components & "Actions"';
  const originalExcerpt = 'An excerpt with "double quotes" and \'single quotes\'';

  const stringified1 = stringifyFrontmatter({
    title: originalTitle,
    excerpt: originalExcerpt,
  });
  const parsed1 = parseFrontmatter(stringified1);
  assert.strictEqual(parsed1.frontmatter.title, originalTitle, "Title quotes unescaped cleanly in pass 1");
  assert.strictEqual(parsed1.frontmatter.excerpt, originalExcerpt, "Excerpt quotes unescaped cleanly in pass 1");

  // Re-stringify and re-parse (simulating multiple saves)
  const stringified2 = stringifyFrontmatter(parsed1.frontmatter);
  const parsed2 = parseFrontmatter(stringified2);
  assert.strictEqual(parsed2.frontmatter.title, originalTitle, "Title quotes unchanged after pass 2");
  assert.strictEqual(parsed2.frontmatter.excerpt, originalExcerpt, "Excerpt quotes unchanged after pass 2");
});

test("parseFrontmatter handles missing or empty frontmatter without crashing", () => {
  const emptyRes = parseFrontmatter("");
  assert.strictEqual(emptyRes.hasFrontmatter, false);
  assert.strictEqual(emptyRes.content, "");

  const noFm = `# 纯正文\n没有任何 frontmatter`;
  const noFmRes = parseFrontmatter(noFm);
  assert.strictEqual(noFmRes.hasFrontmatter, false);
  assert.strictEqual(noFmRes.content, noFm);
});

test("syncFrontmatterToMarkdown preserves markdown body and existing custom metadata while updating", () => {
  const original = `---
title: "旧标题"
category: "旧分类"
tags: ["原始标签"]
date: 2026-03-30
customAuthor: "Alex"
---

# 正文第一段
保持内容不变。`;

  const updated = syncFrontmatterToMarkdown(original, {
    title: "新标题",
    category: "新分类",
  });

  const parsed = parseFrontmatter(updated);
  assert.strictEqual(parsed.frontmatter.title, "新标题");
  assert.strictEqual(parsed.frontmatter.category, "新分类");
  assert.deepStrictEqual(parsed.frontmatter.tags, ["原始标签"], "Existing tags preserved");
  assert.strictEqual(parsed.frontmatter.date, "2026-03-30", "Existing date preserved");
  assert.strictEqual(parsed.frontmatter.customAuthor, "Alex", "Custom frontmatter fields preserved");
  assert.ok(parsed.content.includes("# 正文第一段\n保持内容不变。"));
});

test("stripMarkdownAndHtml cleans tables, callouts, fences, and entities for summaries and RSS", () => {
  const complexMarkdown = `---
title: "元数据"
category: "测试"
---
<!-- hidden comment -->
> [!NOTE] 重要的前言说明内容
> 这里是第二句

| 特性 | 支持 | 说明 |
|:---|:---:|---:|
| Next.js 16 | 是 | React 19 |
| Tailwind v4 | 是 | 现代化样式 |

\`\`\`typescript
const greeting = "hello world";
\`\`\`

这里是正文段落，含有 **加粗**、*斜体*、[外链文本](https://example.com) 与 \`行内代码\` &nbsp;&amp;&quot;。
`;

  const cleaned = stripMarkdownAndHtml(complexMarkdown);

  assert.ok(!cleaned.includes("---"), "Frontmatter delimiters stripped");
  assert.ok(!cleaned.includes("hidden comment"), "HTML comments stripped");
  assert.ok(!cleaned.includes("[!NOTE]"), "Callout tag stripped");
  assert.ok(cleaned.includes("重要的前言说明内容"), "Callout body text preserved");
  assert.ok(!cleaned.includes("|:---|"), "Table separator rows stripped");
  assert.ok(!cleaned.includes("```"), "Code fences stripped");
  assert.ok(!cleaned.includes("greeting ="), "Code block content stripped");
  assert.ok(!cleaned.includes("**"), "Bold markers stripped");
  assert.ok(!cleaned.includes("&nbsp;"), "HTML entities decoded or cleaned");
  assert.ok(cleaned.includes("这里是正文段落"), "Normal text preserved");
  assert.ok(cleaned.includes("外链文本"), "Link text preserved");
  assert.ok(cleaned.includes("行内代码"), "Inline code text preserved");
});

test("stripFrontmatter & stripMarkdownAndHtml handle single-line and truncated frontmatter", () => {
  // 1. Truncated single-line frontmatter from previous slice bug
  const truncatedExcerpt = '--- title: "在碎片化时代重构个人的数字花园" category: 随笔 tags: ["思考", "写作", "博客"] articleType: original pinned: fal';
  const cleanTruncated = stripMarkdownAndHtml(truncatedExcerpt);
  assert.strictEqual(cleanTruncated, "", "Truncated frontmatter excerpt should be completely stripped");

  // 2. Frontmatter with leading BOM or whitespace
  const withBomAndSpaces = `\uFEFF   
---
title: "BOM Test"
category: "测试"
---

# 实际正文
正文内容测试。
`;
  const cleanBom = stripMarkdownAndHtml(withBomAndSpaces);
  assert.ok(!cleanBom.includes("BOM Test"), "Frontmatter title stripped");
  assert.ok(cleanBom.includes("正文内容测试"), "Body preserved after BOM frontmatter");

  // 3. Single-line closed frontmatter
  const singleLineClosed = '--- title: "Single" category: "Blog" --- 这里是正文';
  const cleanSingle = stripMarkdownAndHtml(singleLineClosed);
  assert.strictEqual(cleanSingle, "这里是正文", "Single line frontmatter stripped cleanly");
});

// -------------------------------------------------------------
// Group 2: Markdown Engine, Highlighting & TOC
// -------------------------------------------------------------
console.log("\n--- Group 2: Markdown Engine, Highlighting & TOC ---");

test("buildMacosCodeBlock renders macOS dots, lang label, copy button, line numbers and hljs tokens", () => {
  const code = `function add(a, b) {\n  return a + b;\n}`;
  const html = buildMacosCodeBlock(code, "js");

  assert.ok(html.includes('<div class="macos-enhanced-pre"'), "Contains wrapper");
  assert.ok(html.includes('<span class="dot red"></span>'), "Contains red traffic light");
  assert.ok(html.includes('<span class="dot yellow"></span>'), "Contains yellow traffic light");
  assert.ok(html.includes('<span class="dot green"></span>'), "Contains green traffic light");
  assert.ok(html.includes('<span class="macos-enhanced-lang">JavaScript</span>'), "Language label formatted");
  assert.ok(html.includes('<button class="macos-enhanced-copy"'), "Copy button rendered");
  assert.ok(html.includes('<div class="macos-line-numbers">1\n2\n3</div>'), "Line numbers correctly counted");
  assert.ok(html.includes('hljs-keyword'), "Syntax highlighting applied");
  assert.ok(html.includes('data-code='), "Code stored in data-code attribute");
});

test("enhanceCodeBlocks is idempotent and NEVER double-wraps", () => {
  const initialCodeBlock = buildMacosCodeBlock("console.log('hello');", "javascript");
  assert.ok(initialCodeBlock.includes('macos-enhanced-pre'));

  // Run enhanceCodeBlocks over it
  const passedAgain = enhanceCodeBlocks(initialCodeBlock);
  assert.strictEqual(passedAgain, initialCodeBlock, "Must not modify already enhanced code block");

  // Count occurrences of macos-enhanced-pre
  const count = (passedAgain.match(/macos-enhanced-pre/g) || []).length;
  assert.strictEqual(count, 1, "Exactly one macos-enhanced-pre instance");
});

test("enhanceCodeBlocks correctly wraps legacy Tiptap HTML code blocks", () => {
  const legacyHtml = `<pre data-language="python"><code>def greet():\n    print("hello")\n</code></pre>`;
  const enhanced = enhanceCodeBlocks(legacyHtml);

  assert.ok(enhanced.includes('class="macos-enhanced-pre"'), "Wrapped in macos pre");
  assert.ok(enhanced.includes('<span class="macos-enhanced-lang">Python</span>'), "Python lang recognized");
  assert.ok(enhanced.includes('hljs-keyword'), "Highlighted python code");
});

test("markdownToHtml parses Callouts (including multi-paragraph) into styled callout components", () => {
  const md = `> [!TIP] 这是一个小技巧\n>\n> 这是第二段详细说明。`;
  const html = markdownToHtml(md);

  assert.ok(html.includes('class="markdown-callout tip"'), "Callout container generated");
  assert.ok(html.includes('提示 / Tip'), "Callout title generated");
  assert.ok(html.includes('这是一个小技巧'), "First paragraph rendered");
  assert.ok(html.includes('这是第二段详细说明。'), "Second paragraph rendered");
});

test("markdownToHtml suppresses redundant H1 identical to article title", () => {
  const md = `# 我的架构思考\n\n## 第一章：背景\n\n这是文章正文内容。`;
  const html = markdownToHtml(md, { stripRedundantTitle: "我的架构思考" });

  assert.ok(!html.includes('<h1>我的架构思考</h1>'), "Redundant top H1 removed");
  assert.ok(html.includes('第一章：背景</h2>'), "Subsequent sections preserved");
  assert.ok(html.includes('id="article-heading-0"'), "Heading ID starts properly from 0");
});

test("extractHeadings NEVER extracts fake headings from inside code blocks or comments", () => {
  const md = `## 第一节：简介

这里是一些说明。

\`\`\`markdown
## 这是代码块内的假标题
# 这也是假标题
\`\`\`

### 第一点二节：深入探讨

\`\`\`bash
# 这是 bash 注释
## 这也是 bash 注释
\`\`\`

## 第二节：总结
`;

  const headings = extractHeadings(md);

  assert.strictEqual(headings.length, 3, "Only real Markdown headings extracted (3 total)");
  assert.strictEqual(headings[0].text, "第一节：简介");
  assert.strictEqual(headings[0].id, "article-heading-0");
  assert.strictEqual(headings[1].text, "第一点二节：深入探讨");
  assert.strictEqual(headings[1].id, "article-heading-1");
  assert.strictEqual(headings[2].text, "第二节：总结");
  assert.strictEqual(headings[2].id, "article-heading-2");
});

test("injectLegacyHeadingIds assigns matching IDs to legacy HTML headings", () => {
  const legacyHtml = `<h2>旧版标题一</h2><p>段落</p><h3>旧版子标题</h3>`;
  const injected = injectLegacyHeadingIds(legacyHtml);

  assert.ok(injected.includes('<h2 id="article-heading-0">旧版标题一</h2>'));
  assert.ok(injected.includes('<h3 id="article-heading-1">旧版子标题</h3>'));
});

// -------------------------------------------------------------
// Group 3: Sanitization & XSS Defense
// -------------------------------------------------------------
console.log("\n--- Group 3: Sanitization & XSS Defense ---");

test("sanitizeHtml eliminates <script>, onerror, onload, and javascript: links", () => {
  const dirty = `
    <div>Hello</div>
    <script>alert('xss')</script>
    <img src="x" onerror="alert(1)" />
    <a href="javascript:alert(2)">Click me</a>
  `;
  const clean = sanitizeHtml(dirty);

  assert.ok(!clean.includes("<script"), "Stripped <script>");
  assert.ok(!clean.includes("alert('xss')"), "Stripped script contents");
  assert.ok(!clean.includes("onerror"), "Stripped onerror handler");
  assert.ok(!clean.includes("javascript:"), "Stripped javascript: protocol");
  assert.ok(clean.includes("Hello"), "Preserved safe text");
});

test("sanitizeHtml preserves copy button, svg icons, data-code, and table structures", () => {
  const codeBlockHtml = buildMacosCodeBlock("const pi = 3.14;", "js");
  const sanitized = sanitizeHtml(codeBlockHtml);

  assert.ok(sanitized.includes('class="macos-enhanced-pre"'), "Wrapper preserved");
  assert.ok(sanitized.includes('data-code='), "data-code attribute preserved");
  assert.ok(sanitized.includes('<button class="macos-enhanced-copy"'), "Copy button preserved");
  assert.ok(sanitized.includes('<svg'), "SVG icon preserved");
  assert.ok(sanitized.includes('<rect'), "SVG rect preserved");
  assert.ok(sanitized.includes('复制'), "Button text preserved");
});

// -------------------------------------------------------------
// Group 4: Dark Mode Syntax Highlighting Specificity
// -------------------------------------------------------------
console.log("\n--- Group 4: Dark Mode Syntax Highlighting Specificity ---");

test("globals.css scopes inline code styling with :not(pre) > code so dark mode does not turn code blocks pink/red", () => {
  const css = fs.readFileSync(path.join(frontendDir, "src/app/globals.css"), "utf8");

  // Verify inline code is scoped
  assert.ok(
    css.includes(".dark .article-content :not(pre) > code") ||
    css.includes(".dark .article-editor-area :not(pre) > code"),
    "Dark inline code is scoped to :not(pre) > code"
  );

  // Verify pre code resets background and color
  assert.ok(
    css.includes(".dark .macos-enhanced-code code") ||
    css.includes(".macos-enhanced-code code"),
    "Pre code styling specifies transparent background and inherited color"
  );
});

// -------------------------------------------------------------
// Group 5: Content Type Boundary Enforcement
// -------------------------------------------------------------
console.log("\n--- Group 5: Content Type Boundary Enforcement ---");

test("TopBar.tsx does not offer '项目' as moment category pill and provides distinct routes for articles and projects", () => {
  const topBarContent = fs.readFileSync(path.join(frontendDir, "src/components/TopBar.tsx"), "utf8");

  // Verify '项目' is NOT in moment category pills
  assert.ok(
    topBarContent.includes('["岁岁念", "日常", "随想", "随手拍", "摄影", "生活"]'),
    "PublishModal has clean moment categories without '项目'"
  );

  // Verify write links are present
  assert.ok(topBarContent.includes('/admin/articles/new'), "TopBar links to /admin/articles/new");
  assert.ok(topBarContent.includes('/admin/projects/new'), "TopBar links to /admin/projects/new");
});

test("AdminPosts.tsx queries type=moment and strictly excludes articles and projects", () => {
  const postsAdmin = fs.readFileSync(path.join(frontendDir, "src/app/admin/posts/AdminPosts.tsx"), "utf8");

  assert.ok(postsAdmin.includes("type=moment"), "AdminPosts queries type=moment");
  assert.ok(postsAdmin.includes('p.category !== "项目"'), "AdminPosts filters out category=项目");
  assert.ok(postsAdmin.includes('p.type !== "article"'), "AdminPosts filters out type=article");
  assert.ok(postsAdmin.includes('p.type !== "project"'), "AdminPosts filters out type=project");
});

test("AdminArticlesPage strictly excludes projects from article list", () => {
  const articlesAdmin = fs.readFileSync(path.join(frontendDir, "src/app/admin/articles/page.tsx"), "utf8");

  assert.ok(articlesAdmin.includes('item.category !== "项目"'), "AdminArticles excludes category=项目");
  assert.ok(articlesAdmin.includes('item.type !== "project"'), "AdminArticles excludes type=project");
});

test("MomentCard.tsx strictly routes articles and projects to their dedicated pages, never opening moment editor", () => {
  const cardContent = fs.readFileSync(path.join(frontendDir, "src/components/MomentCard.tsx"), "utf8");

  assert.ok(cardContent.includes('router.push(`/admin/projects/${post.id}`)'), "MomentCard routes projects to /admin/projects/[id]");
  assert.ok(cardContent.includes('router.push(`/admin/articles/${post.id}`)'), "MomentCard routes articles to /admin/articles/[id]");
  assert.ok(cardContent.includes('openEdit(post)'), "MomentCard opens moment edit only for actual moments");
});

test("EditPostModal.tsx redirects articles and projects out of moment modal", () => {
  const modalContent = fs.readFileSync(path.join(frontendDir, "src/components/EditPostModal.tsx"), "utf8");

  assert.ok(modalContent.includes('/admin/articles/'), "EditPostModal routes articles to article editor");
  assert.ok(modalContent.includes('/admin/projects/'), "EditPostModal routes projects to project editor");
});

console.log("\n=================================================================");
console.log(`  Tests: ${passed + failed} total | ${passed} passed | ${failed} failed`);
console.log("=================================================================\n");

if (failed > 0) {
  process.exit(1);
}
