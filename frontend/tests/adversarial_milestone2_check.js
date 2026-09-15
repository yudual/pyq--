/**
 * Forensic Auditor M2 Adversarial Verification Script
 * Stress-tests Milestone 2 deliverables:
 * 1. MomentCard structure, imports, and lack of article coupling
 * 2. ProjectCard cleanliness (0 moment fields, 0 ad remnants)
 * 3. ArticleFeedCard cleanliness (0 moment bubbles/menus)
 * 4. PostList polymorphic FeedDispatcher contracts
 * 5. PostCard re-export backward compatibility
 * 6. Legacy ad scan across all frontend/src files
 */

const fs = require("node:fs");
const path = require("node:path");

const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(FRONTEND_ROOT, "src");

const failures = [];
function check(description, fn) {
  try {
    const result = fn();
    if (result === false) {
      failures.push({ description, error: "Condition returned false" });
      console.log(`❌ FAIL: ${description}`);
    } else {
      console.log(`✅ PASS: ${description}`);
    }
  } catch (err) {
    failures.push({ description, error: err.message });
    console.log(`❌ FAIL: ${description} -> ${err.message}`);
  }
}

console.log("=== Running Forensic Auditor M2 Adversarial Integrity Checks ===");

// 1. MomentCard verification
check("MomentCard exists and has substantial genuine implementation (>400 lines)", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/MomentCard.tsx"), "utf-8");
  const lineCount = content.split("\n").length;
  if (lineCount < 400) throw new Error(`Only ${lineCount} lines, expected genuine rich component`);
  return true;
});

check("MomentCard has zero references to isArticle branching", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/MomentCard.tsx"), "utf-8");
  if (content.includes("isArticle")) throw new Error("Found isArticle in MomentCard");
  return true;
});

check("MomentCard renders genuine moments interactions: ActionMenu, InteractionBubble, CommentSection", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/MomentCard.tsx"), "utf-8");
  if (!content.includes("<ActionMenu")) throw new Error("Missing ActionMenu");
  if (!content.includes("<InteractionBubble")) throw new Error("Missing InteractionBubble");
  if (!content.includes("<CommentSection")) throw new Error("Missing CommentSection");
  return true;
});

check("MomentCard handles optimistic like updates with error rollback", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/MomentCard.tsx"), "utf-8");
  if (!content.includes("setLiked(!prevLiked)")) throw new Error("Missing optimistic like flip");
  if (!content.includes("setLiked(prevLiked)")) throw new Error("Missing optimistic like rollback");
  return true;
});

check("MomentCard has no hardcoded test mocks or bypassed checks", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/MomentCard.tsx"), "utf-8");
  if (content.includes("process.env.NODE_ENV === \"test\"")) throw new Error("Test environment bypass detected");
  if (content.includes("__MOCK__")) throw new Error("Mock bypass detected");
  return true;
});

// 2. ProjectCard cleanliness
check("ProjectCard exists and exports default function ProjectCard", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/ProjectCard.tsx"), "utf-8");
  return content.includes("export default function ProjectCard");
});

check("ProjectCard has 0 references to ActionMenu, likes, comments, or location", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/ProjectCard.tsx"), "utf-8");
  const forbidden = ["ActionMenu", "likeCount", "post.likes", "Heart", "CommentSection", "post.location", "emoji"];
  for (const word of forbidden) {
    if (content.includes(word)) throw new Error(`ProjectCard leaked moment field: ${word}`);
  }
  return true;
});

// 3. ArticleFeedCard cleanliness
check("ArticleFeedCard exists and routes solely to /articles/[id]", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/ArticleFeedCard.tsx"), "utf-8");
  if (!content.includes("/articles/${post.shortId || post.id}")) {
    throw new Error("ArticleFeedCard does not route to canonical article detail");
  }
  return true;
});

check("ArticleFeedCard has 0 references to ActionMenu, InteractionBubble, CommentSection, or location", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/ArticleFeedCard.tsx"), "utf-8");
  const forbidden = ["ActionMenu", "InteractionBubble", "CommentSection", "post.location"];
  for (const word of forbidden) {
    if (content.includes(word)) throw new Error(`ArticleFeedCard leaked moment interaction: ${word}`);
  }
  return true;
});

// 4. PostCard re-export backward compatibility
check("PostCard re-exports MomentCard cleanly", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/PostCard.tsx"), "utf-8");
  if (!content.includes("export default MomentCard;")) throw new Error("PostCard does not re-export MomentCard");
  return true;
});

// 5. PostList polymorphic dispatcher
check("PostList exports FeedDispatcher and dispatches projects, articles, and moments", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/PostList.tsx"), "utf-8");
  if (!content.includes("export function FeedDispatcher")) throw new Error("Missing FeedDispatcher export");
  if (!content.includes("<ProjectCard")) throw new Error("FeedDispatcher does not use ProjectCard");
  if (!content.includes("<ArticleFeedCard")) throw new Error("FeedDispatcher does not use ArticleFeedCard");
  if (!content.includes("<MomentCard")) throw new Error("FeedDispatcher does not use MomentCard");
  return true;
});

check("PostList default feed renders via FeedDispatcher", () => {
  const content = fs.readFileSync(path.join(SRC_DIR, "components/PostList.tsx"), "utf-8");
  if (!content.includes("<FeedDispatcher key={post.id} post={post} index={index} />")) {
    throw new Error("PostList does not render FeedDispatcher in home feed");
  }
  return true;
});

// 6. Complete 0 legacy ad scan across entire frontend/src
check("Zero legacy ad remnants across entire frontend/src", () => {
  const adKeywords = [
    "is_ad",
    "ad_avatar",
    "ad_nickname",
    "ad_on_archives",
    "adslot",
    "adcard",
    "adsbygoogle",
    "AdminAds",
  ];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (/\.(tsx|ts|jsx|js|css|json)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf-8");
        for (const kw of adKeywords) {
          const regex = new RegExp(`\\b${kw}\\b`, "i");
          if (regex.test(text)) {
            throw new Error(`Found legacy ad remnant '${kw}' in ${full}`);
          }
        }
      }
    }
  }

  scan(SRC_DIR);
  return true;
});

console.log("\n=======================================================");
console.log(`Auditor M2 Adversarial Check Result: ${failures.length === 0 ? "ALL 11 CHECKS PASSED" : `${failures.length} FAILURES`}`);
console.log("=======================================================");

if (failures.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
