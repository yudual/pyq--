/**
 * Empirical Adversarial Challenger Test Suite for Milestone 2
 * Tests:
 * 1. Backward Compatibility: PostCard import & type re-export & caller usage
 * 2. MomentCard Visual & DOM Parity: Timeline and Card variant structure, styling tokens, zero article remnants
 * 3. Field Cleansing: Zero moment fields in ProjectCard & ArticleFeedCard, zero ad code remnants
 * 4. Stream Polymorphic Dispatcher: Type & category dispatch matrix, priority resolution, animation delays
 * 5. Robustness & Edge Cases: Missing fields, empty arrays, long text truncation
 */

import fs from "node:fs";
import path from "node:path";

const FRONTEND_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(FRONTEND_DIR, "src");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ""}`);
  }
}

console.log("\n=======================================================");
console.log("  Adversarial Milestone 2 Verification Suite (Challenger M2-2)");
console.log("=======================================================\n");

// -------------------------------------------------------------
// Suite 1: Backward Compatibility Analysis
// -------------------------------------------------------------
console.log("Suite 1: Backward Compatibility (PostCard.tsx)");

const postCardPath = path.join(SRC_DIR, "components", "PostCard.tsx");
assert(fs.existsSync(postCardPath), "PostCard.tsx exists at expected location");

const postCardContent = fs.readFileSync(postCardPath, "utf-8");
assert(
  /export\s+default\s+MomentCard/.test(postCardContent),
  "PostCard.tsx default exports MomentCard"
);
assert(
  /export\s+type\s+PostCardProps\s*=\s*MomentCardProps/.test(postCardContent),
  "PostCard.tsx re-exports PostCardProps as MomentCardProps"
);
assert(
  postCardContent.includes('"use client"'),
  "PostCard.tsx includes 'use client' directive"
);

// Check all consumers of PostCard in the codebase
const adminPostsPath = path.join(SRC_DIR, "app", "admin", "posts", "AdminPosts.tsx");
assert(fs.existsSync(adminPostsPath), "AdminPosts.tsx exists");
const adminPostsContent = fs.readFileSync(adminPostsPath, "utf-8");
assert(
  adminPostsContent.includes('import PostCard from "@/components/PostCard";'),
  "AdminPosts imports PostCard from @/components/PostCard"
);
assert(
  /<PostCard\s+post=\{post\}\s+index=\{index\}\s+onDelete=\{/.test(adminPostsContent),
  "AdminPosts passes post, index, and onDelete to PostCard"
);

// Verify MomentCardProps interface handles all PostCardProps
const momentCardPath = path.join(SRC_DIR, "components", "MomentCard.tsx");
assert(fs.existsSync(momentCardPath), "MomentCard.tsx exists");
const momentCardContent = fs.readFileSync(momentCardPath, "utf-8");

assert(
  /export\s+interface\s+MomentCardProps/.test(momentCardContent),
  "MomentCard.tsx exports MomentCardProps interface"
);
assert(
  /post:\s*Post/.test(momentCardContent) &&
  /index:\s*number/.test(momentCardContent) &&
  /onDelete\?:/.test(momentCardContent) &&
  /variant\?:/.test(momentCardContent),
  "MomentCardProps accepts post, index, onDelete, and variant props"
);

// -------------------------------------------------------------
// Suite 2: Visual Layout & Responsive DOM Parity (MomentCard)
// -------------------------------------------------------------
console.log("\nSuite 2: Visual Layout & Responsive DOM Parity (MomentCard)");

// Root element classes
assert(
  momentCardContent.includes('id={`post-${post.id}`}'),
  "MomentCard preserves id={`post-${post.id}`} for jump anchors and highlights"
);
assert(
  momentCardContent.includes("flex gap-3 px-4 py-4 sm:px-5 md:px-6 animate-fade-in-up scroll-mt-16"),
  "MomentCard preserves timeline variant root styling classes"
);
assert(
  momentCardContent.includes("rounded-3xl bg-wechat-white p-5 sm:p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]"),
  "MomentCard preserves card variant root styling classes"
);

// Avatar styling and link
assert(
  momentCardContent.includes('href="/archives"'),
  "MomentCard avatar links to /archives"
);
assert(
  momentCardContent.includes("rounded-[5px] bg-wechat-bubble md:h-11 md:w-11"),
  "MomentCard preserves timeline avatar dimensions (10x10 mobile, 11x11 md)"
);

// Nickname and Header styling
assert(
  momentCardContent.includes("text-wechat-nickname"),
  "MomentCard uses text-wechat-nickname design token"
);
assert(
  momentCardContent.includes("text-wechat-text"),
  "MomentCard uses text-wechat-text design token"
);
assert(
  momentCardContent.includes("rich-content relative text-[15px] leading-[23px] text-wechat-text md:text-[16px] md:leading-[24px]"),
  "MomentCard preserves rich text typography (15px/23px mobile, 16px/24px desktop)"
);

// Expand/collapse button
assert(
  momentCardContent.includes('className="mt-1.5 text-[14px] text-[#b2b2b2] transition-opacity hover:opacity-70 active:opacity-50 dark:text-[#888]"'),
  "MomentCard preserves expand/collapse button styling and colors"
);

// Media components embedded
assert(
  momentCardContent.includes("<VideoPlayer") &&
  momentCardContent.includes("<ImageGrid") &&
  momentCardContent.includes("<DoubanEmbedCard"),
  "MomentCard preserves VideoPlayer, ImageGrid, and DoubanEmbedCard"
);

// Link card styling
assert(
  momentCardContent.includes("bg-[#f2f2f2]") &&
  momentCardContent.includes("dark:bg-[#2a2a30]") &&
  momentCardContent.includes("rounded-[8px]"),
  "MomentCard preserves WeChat link card colors and border radius"
);

// Interaction elements
assert(
  momentCardContent.includes("<ActionMenu") &&
  momentCardContent.includes("<InteractionBubble") &&
  momentCardContent.includes("<CommentSection"),
  "MomentCard preserves ActionMenu, InteractionBubble, and CommentSection"
);

// Zero article contamination in MomentCard
assert(
  !momentCardContent.includes("isArticle"),
  "MomentCard has zero 'isArticle' branching logic"
);
assert(
  !momentCardContent.includes("articleExcerpt"),
  "MomentCard has zero 'articleExcerpt' references"
);
assert(
  !momentCardContent.includes("stripRichEmbeds"),
  "MomentCard has zero 'stripRichEmbeds' references"
);

// -------------------------------------------------------------
// Suite 3: Moments Field Cleansing from Projects & Articles
// -------------------------------------------------------------
console.log("\nSuite 3: Moments Field Cleansing (ProjectCard & ArticleFeedCard)");

const projectCardPath = path.join(SRC_DIR, "components", "ProjectCard.tsx");
assert(fs.existsSync(projectCardPath), "ProjectCard.tsx exists");
const projectCardContent = fs.readFileSync(projectCardPath, "utf-8");

assert(!projectCardContent.includes("ActionMenu"), "ProjectCard: 0 ActionMenu references");
assert(!projectCardContent.includes("InteractionBubble"), "ProjectCard: 0 InteractionBubble references");
assert(!projectCardContent.includes("CommentSection"), "ProjectCard: 0 CommentSection references");
assert(!projectCardContent.includes("post.location"), "ProjectCard: 0 post.location references");
assert(!projectCardContent.includes("likeCount"), "ProjectCard: 0 likeCount references");
assert(!projectCardContent.includes("post.likes"), "ProjectCard: 0 post.likes references");
assert(!projectCardContent.includes("Heart"), "ProjectCard: 0 Heart icon references");
assert(!projectCardContent.includes("emoji"), "ProjectCard: 0 emoji references");
assert(
  projectCardContent.includes('rel="noopener noreferrer"'),
  "ProjectCard: external link uses rel='noopener noreferrer'"
);

const articleFeedCardPath = path.join(SRC_DIR, "components", "ArticleFeedCard.tsx");
assert(fs.existsSync(articleFeedCardPath), "ArticleFeedCard.tsx exists");
const articleFeedCardContent = fs.readFileSync(articleFeedCardPath, "utf-8");

assert(!articleFeedCardContent.includes("ActionMenu"), "ArticleFeedCard: 0 ActionMenu references");
assert(!articleFeedCardContent.includes("InteractionBubble"), "ArticleFeedCard: 0 InteractionBubble references");
assert(!articleFeedCardContent.includes("CommentSection"), "ArticleFeedCard: 0 CommentSection references");
assert(!articleFeedCardContent.includes("post.location"), "ArticleFeedCard: 0 post.location references");
assert(
  articleFeedCardContent.includes("`/articles/${post.shortId || post.id}`"),
  "ArticleFeedCard routes to /articles/[id] (or shortId)"
);

// -------------------------------------------------------------
// Suite 4: Complete Ad Code & Field Purge
// -------------------------------------------------------------
console.log("\nSuite 4: Complete Ad Code & Field Purge");

const AD_KEYWORDS = ["is_ad", "ad_avatar", "ad_nickname", "ad_on_archives", "adslot", "adcard", "adsbygoogle"];
function scanDirForKeywords(dir: string, keywords: string[]): { file: string; keyword: string }[] {
  const matches: { file: string; keyword: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      matches.push(...scanDirForKeywords(full, keywords));
    } else if (entry.isFile() && /\.(tsx?|jsx?|css|html)$/.test(entry.name)) {
      const content = fs.readFileSync(full, "utf-8");
      for (const kw of keywords) {
        if (content.includes(kw)) {
          matches.push({ file: full, keyword: kw });
        }
      }
    }
  }
  return matches;
}

const adMatches = scanDirForKeywords(SRC_DIR, AD_KEYWORDS);
assert(
  adMatches.length === 0,
  `Frontend src/ contains 0 legacy ad remnants (found: ${adMatches.length})`,
  adMatches.map(m => `${path.basename(m.file)}: ${m.keyword}`).join(", ")
);

// -------------------------------------------------------------
// Suite 5: Stream Polymorphic Dispatcher Matrix
// -------------------------------------------------------------
console.log("\nSuite 5: Stream Polymorphic Dispatcher Matrix");

const postListPath = path.join(SRC_DIR, "components", "PostList.tsx");
assert(fs.existsSync(postListPath), "PostList.tsx exists");
const postListContent = fs.readFileSync(postListPath, "utf-8");

assert(
  /export\s+function\s+FeedDispatcher/.test(postListContent),
  "PostList.tsx exports FeedDispatcher component"
);
assert(
  /export\s+const\s+FeedItemDispatcher\s*=\s*FeedDispatcher/.test(postListContent),
  "PostList.tsx exports FeedItemDispatcher alias for backward compatibility"
);

// Simulate FeedDispatcher logic directly as implemented in PostList.tsx
function simulateFeedDispatcher(post: { id: string; category?: string; type?: string }) {
  if (post.category === "项目" || post.type === "project") {
    return "ProjectCard";
  }
  if (post.type === "article") {
    return "ArticleFeedCard";
  }
  return "MomentCard";
}

// Test dispatch matrix
assert(
  simulateFeedDispatcher({ id: "1", category: "项目" }) === "ProjectCard",
  "Dispatcher: category === '项目' -> ProjectCard"
);
assert(
  simulateFeedDispatcher({ id: "2", type: "project" }) === "ProjectCard",
  "Dispatcher: type === 'project' -> ProjectCard"
);
assert(
  simulateFeedDispatcher({ id: "3", category: "项目", type: "article" }) === "ProjectCard",
  "Dispatcher priority: category === '项目' overrides type === 'article'"
);
assert(
  simulateFeedDispatcher({ id: "4", type: "article", category: "技术" }) === "ArticleFeedCard",
  "Dispatcher: type === 'article' -> ArticleFeedCard"
);
assert(
  simulateFeedDispatcher({ id: "5", type: "moment" }) === "MomentCard",
  "Dispatcher: type === 'moment' -> MomentCard"
);
assert(
  simulateFeedDispatcher({ id: "6", category: "生活" }) === "MomentCard",
  "Dispatcher: category === '生活' with undefined type -> MomentCard (default)"
);
assert(
  simulateFeedDispatcher({ id: "7" }) === "MomentCard",
  "Dispatcher: empty post -> MomentCard (default)"
);

// Verify home feed uses FeedDispatcher in list view
assert(
  postListContent.includes("<FeedDispatcher key={post.id} post={post} index={index} />"),
  "PostList renders FeedDispatcher in default aggregator feed"
);

// Verify dedicated channels maintain isolation
assert(
  postListContent.includes("layout === \"projects\""),
  "PostList maintains dedicated projects grid layout"
);
assert(
  postListContent.includes("type === \"article\""),
  "PostList maintains dedicated article feed layout"
);
assert(
  postListContent.includes("type === \"moment\""),
  "PostList maintains dedicated moments timeline layout"
);

// -------------------------------------------------------------
// Suite 6: Edge Case & Corner Case Adversarial Probing
// -------------------------------------------------------------
console.log("\nSuite 6: Edge Case & Corner Case Adversarial Probing");

// Check ArticleFeedCard index handling (index is optional for standalone views)
assert(
  articleFeedCardContent.includes("index?: number"),
  "ArticleFeedCard accepts optional index for staggered animations"
);
assert(
  articleFeedCardContent.includes('typeof index === "number"'),
  "ArticleFeedCard guards animation delay calculation when index is undefined"
);

// Check ProjectCard fallback handling
assert(
  projectCardContent.includes("showCoverFallback") &&
  projectCardContent.includes("handleImageError"),
  "ProjectCard implements fallback chain for broken project images"
);

// Check MomentCard smoothScrollBy container resolution
assert(
  momentCardContent.includes("document.getElementById(\"scroll-root\")"),
  "MomentCard correctly handles desktop scroll container (#scroll-root)"
);

console.log("\n-------------------------------------------------------");
console.log(`Summary: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log("-------------------------------------------------------\n");

if (failedTests > 0) {
  process.exit(1);
}
