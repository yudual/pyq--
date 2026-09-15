/**
 * Empirical Adversarial Edge Cases Challenger Test Suite (M1 Round 2)
 *
 * Tests:
 * 1. 42 matrix combinations of category x type across all 3 channels (/projects, /articles, /moments)
 *    -> 126 route navigation traces
 *    -> Verifies 100% termination in <= 1 hop (strictly 0 loops)
 * 2. Detailed invariant validation for:
 *    - type === "project" (regardless of category)
 *    - category === "项目" and type === "article" (the reported bug)
 *    - missing category (undefined, empty string)
 *    - missing type (undefined, empty string)
 *    - unknown type / unknown category
 * 3. Null/undefined post handling
 */

interface PostItem {
  id: string;
  shortId?: string;
  type?: any;
  category?: any;
}

type Channel = "projects" | "articles" | "moments";
type GuardResult =
  | { action: "notFound" }
  | { action: "redirect"; target: Channel; url: string }
  | { action: "render"; url: string };

function runProjectGuard(post: PostItem | null | undefined): GuardResult {
  if (!post) return { action: "notFound" };
  const targetId = post.shortId || post.id;
  const isProject = post.category === "项目" || post.type === "project";
  if (!isProject) {
    if (post.type === "article") {
      return { action: "redirect", target: "articles", url: `/articles/${targetId}` };
    }
    return { action: "redirect", target: "moments", url: `/moments/${targetId}` };
  }
  return { action: "render", url: `/projects/${targetId}` };
}

function runArticleGuard(post: PostItem | null | undefined): GuardResult {
  if (!post) return { action: "notFound" };
  const targetId = post.shortId || post.id;
  if (post.category === "项目" || post.type === "project") {
    return { action: "redirect", target: "projects", url: `/projects/${targetId}` };
  }
  if (post.type !== "article") {
    return { action: "redirect", target: "moments", url: `/moments/${targetId}` };
  }
  return { action: "render", url: `/articles/${targetId}` };
}

function runMomentGuard(post: PostItem | null | undefined): GuardResult {
  if (!post) return { action: "notFound" };
  const targetId = post.shortId || post.id;
  if (post.category === "项目" || post.type === "project") {
    return { action: "redirect", target: "projects", url: `/projects/${targetId}` };
  }
  if (post.type === "article") {
    return { action: "redirect", target: "articles", url: `/articles/${targetId}` };
  }
  return { action: "render", url: `/moments/${targetId}` };
}

function simulateStep(channel: Channel, post: PostItem | null | undefined): GuardResult {
  if (channel === "projects") return runProjectGuard(post);
  if (channel === "articles") return runArticleGuard(post);
  if (channel === "moments") return runMomentGuard(post);
  throw new Error(`Unknown channel ${channel}`);
}

function traceNavigation(startChannel: Channel, post: PostItem | null | undefined, maxHops = 10) {
  let curChannel = startChannel;
  const history: Array<{ channel: Channel; result: GuardResult }> = [];

  for (let hop = 0; hop < maxHops; hop++) {
    const res = simulateStep(curChannel, post);
    history.push({ channel: curChannel, result: res });
    if (res.action === "render" || res.action === "notFound") {
      return { finalStatus: res.action, hops: hop, landingChannel: curChannel, history, isLoop: false };
    }
    curChannel = res.target;
  }

  return { finalStatus: "loop", hops: maxHops, landingChannel: curChannel, history, isLoop: true };
}

// MATRIX SETUP
const categories = [
  "项目",
  "随笔",
  "技术",
  "生活",
  "",
  undefined,
];

const types = [
  "project",
  "article",
  "moment",
  "unknown_custom_type",
  "",
  undefined,
  null,
];

let totalCases = 0;
let passedCases = 0;
let failedCases: string[] = [];

console.log("=== RUNNING EXHAUSTIVE 42-COMBINATION MATRIX TEST ACROSS 3 CHANNELS ===");

for (const cat of categories) {
  for (const typ of types) {
    const post: PostItem = {
      id: "post-123",
      shortId: "slug-abc",
      category: cat,
      type: typ,
    };

    const channels: Channel[] = ["projects", "articles", "moments"];

    // Expected destination determination:
    let expectedChannel: Channel;
    if (cat === "项目" || typ === "project") {
      expectedChannel = "projects";
    } else if (typ === "article") {
      expectedChannel = "articles";
    } else {
      expectedChannel = "moments";
    }

    for (const startCh of channels) {
      totalCases++;
      const trace = traceNavigation(startCh, post);

      if (trace.isLoop) {
        failedCases.push(`Loop detected for cat=${cat}, type=${typ} starting at ${startCh}!`);
        continue;
      }

      if (trace.hops > 1) {
        failedCases.push(`Multi-hop bounce (${trace.hops} hops) for cat=${cat}, type=${typ} starting at ${startCh}! History: ${JSON.stringify(trace.history)}`);
        continue;
      }

      if (trace.landingChannel !== expectedChannel) {
        failedCases.push(`Wrong landing channel for cat=${cat}, type=${typ} starting at ${startCh}! Expected ${expectedChannel}, got ${trace.landingChannel}`);
        continue;
      }

      if (trace.finalStatus !== "render") {
        failedCases.push(`Did not render for cat=${cat}, type=${typ} starting at ${startCh}! Status: ${trace.finalStatus}`);
        continue;
      }

      passedCases++;
    }
  }
}

// Test null & undefined post across all channels
console.log("\n=== TESTING NULL / UNDEFINED POST EDGE CASES ===");
for (const nullish of [null, undefined]) {
  for (const ch of ["projects", "articles", "moments"] as Channel[]) {
    totalCases++;
    const res = simulateStep(ch, nullish as any);
    if (res.action === "notFound") {
      passedCases++;
    } else {
      failedCases.push(`Nullish post on ${ch} did not trigger notFound! Got ${JSON.stringify(res)}`);
    }
  }
}

// Test ID fallbacks
console.log("\n=== TESTING ID FALLBACK EDGE CASES ===");
const idCases = [
  { post: { id: "id-only", type: "article", category: "文章" }, expectedUrl: "/articles/id-only" },
  { post: { id: "id-val", shortId: "", type: "article", category: "文章" }, expectedUrl: "/articles/id-val" },
  { post: { id: "id-val", shortId: undefined, type: "article", category: "文章" }, expectedUrl: "/articles/id-val" },
  { post: { id: "id-val", shortId: "short-custom", type: "article", category: "文章" }, expectedUrl: "/articles/short-custom" },
];

for (const tc of idCases) {
  totalCases++;
  const res = simulateStep("moments", tc.post);
  if (res.action === "redirect" && res.url === tc.expectedUrl) {
    passedCases++;
  } else {
    failedCases.push(`ID test failed: expected ${tc.expectedUrl}, got ${JSON.stringify(res)}`);
  }
}

console.log(`\n========================================`);
console.log(`Total test cases: ${totalCases}`);
console.log(`Passed: ${passedCases}`);
console.log(`Failed: ${failedCases.length}`);

if (failedCases.length > 0) {
  console.error("FAILURES:");
  for (const f of failedCases) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log("ALL EXHAUSTIVE ADVERSARIAL EDGE CASE TESTS PASSED (0 LOOPS, <= 1 HOP GUARANTEE)!");
  process.exit(0);
}
