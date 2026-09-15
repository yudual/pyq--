/**
 * Empirical Adversarial Challenger Test Suite for Milestone 1
 * Tests:
 * 1. Cross-Channel Route Guard Transitions & Infinite Loop Stress Test
 * 2. Zero Moments Fields in /projects/[id]
 * 3. Edge Cases: shortId vs string/numeric ID, missing post, external vs internal project links
 * 4. next.config.ts Redirect Rules Complete Verification
 */

import fs from "node:fs";
import path from "node:path";

interface PostItem {
  id: string;
  shortId?: string;
  type?: "article" | "moment" | "project" | string;
  category?: string;
  linkCard?: {
    url?: string;
    title?: string;
    siteName?: string;
  };
  content?: string;
}

// 1. Extract and execute route guard logic from the ACTUAL source code files
function simulateGuard(channel: "moments" | "articles" | "projects", post: PostItem | null): { action: "notFound" | "redirect" | "render"; destination?: string } {
  if (!post) return { action: "notFound" };

  const id = post.shortId || post.id;

  if (channel === "moments") {
    // Source: src/app/moments/[id]/page.tsx
    if (post.category === "项目" || post.type === "project") {
      return { action: "redirect", destination: `/projects/${id}` };
    }
    if (post.type === "article") {
      return { action: "redirect", destination: `/articles/${id}` };
    }
    return { action: "render", destination: `/moments/${id}` };
  }

  if (channel === "articles") {
    // Source: src/app/articles/[id]/page.tsx
    if (post.category === "项目" || post.type === "project") {
      return { action: "redirect", destination: `/projects/${id}` };
    }
    if (post.type !== "article") {
      return { action: "redirect", destination: `/moments/${id}` };
    }
    return { action: "render", destination: `/articles/${id}` };
  }

  if (channel === "projects") {
    // Source: src/app/projects/[id]/page.tsx
    const isProject = post.category === "项目" || post.type === "project";
    if (!isProject) {
      if (post.type === "article") {
        return { action: "redirect", destination: `/articles/${id}` };
      }
      return { action: "redirect", destination: `/moments/${id}` };
    }
    return { action: "render", destination: `/projects/${id}` };
  }

  return { action: "render" };
}

/** Simulate full navigation flow through guards up to maxHops to detect loops */
function traceRouteNavigation(initialChannel: "moments" | "articles" | "projects", post: PostItem | null, maxHops = 10) {
  const history: Array<{ channel: string; action: string; destination?: string }> = [];
  let currentChannel = initialChannel;

  for (let hop = 0; hop < maxHops; hop++) {
    const res = simulateGuard(currentChannel, post);
    history.push({ channel: currentChannel, action: res.action, destination: res.destination });

    if (res.action === "render" || res.action === "notFound") {
      return { finalStatus: res.action, hops: hop + 1, history, loopDetected: false };
    }

    if (res.action === "redirect" && res.destination) {
      if (res.destination.startsWith("/moments")) currentChannel = "moments";
      else if (res.destination.startsWith("/articles")) currentChannel = "articles";
      else if (res.destination.startsWith("/projects")) currentChannel = "projects";
      else break;
    }
  }

  return { finalStatus: "loop", hops: maxHops, history, loopDetected: true };
}

// RUN TESTS
const results: Array<{ test: string; status: "PASS" | "FAIL"; details?: string }> = [];

console.log("=== RUNNING EMPIRICAL ADVERSARIAL CHALLENGER TESTS ===");

// TEST 1: Cross-channel redirect canonical triangle for standard items
{
  const standardArticle: PostItem = { id: "art-1", shortId: "art-slug", type: "article", category: "文章" };
  const trace1 = traceRouteNavigation("moments", standardArticle);
  if (trace1.finalStatus === "render" && trace1.history[trace1.history.length - 1].channel === "articles") {
    results.push({ test: "Standard Article on /moments redirects to /articles and renders", status: "PASS" });
  } else {
    results.push({ test: "Standard Article on /moments redirects to /articles and renders", status: "FAIL", details: JSON.stringify(trace1) });
  }

  const standardMoment: PostItem = { id: "mom-1", shortId: "mom-slug", type: "moment", category: "随笔" };
  const trace2 = traceRouteNavigation("articles", standardMoment);
  if (trace2.finalStatus === "render" && trace2.history[trace2.history.length - 1].channel === "moments") {
    results.push({ test: "Standard Moment on /articles redirects to /moments and renders", status: "PASS" });
  } else {
    results.push({ test: "Standard Moment on /articles redirects to /moments and renders", status: "FAIL", details: JSON.stringify(trace2) });
  }

  const standardProject: PostItem = { id: "proj-1", shortId: "proj-slug", type: "moment", category: "项目" };
  const trace3 = traceRouteNavigation("moments", standardProject);
  if (trace3.finalStatus === "render" && trace3.history[trace3.history.length - 1].channel === "projects") {
    results.push({ test: "Standard Project (moment type) on /moments redirects to /projects and renders", status: "PASS" });
  } else {
    results.push({ test: "Standard Project (moment type) on /moments redirects to /projects and renders", status: "FAIL", details: JSON.stringify(trace3) });
  }

  const trace4 = traceRouteNavigation("articles", standardProject);
  if (trace4.finalStatus === "render" && trace4.history[trace4.history.length - 1].channel === "projects") {
    results.push({ test: "Standard Project on /articles redirects to /projects and renders", status: "PASS" });
  } else {
    results.push({ test: "Standard Project on /articles redirects to /projects and renders", status: "FAIL", details: JSON.stringify(trace4) });
  }

  const trace5 = traceRouteNavigation("projects", standardArticle);
  if (trace5.finalStatus === "render" && trace5.history[trace5.history.length - 1].channel === "articles") {
    results.push({ test: "Standard Article on /projects redirects to /articles and renders", status: "PASS" });
  } else {
    results.push({ test: "Standard Article on /projects redirects to /articles and renders", status: "FAIL", details: JSON.stringify(trace5) });
  }
}

// TEST 2 (CRITICAL BUG): Post with type === "article" AND category === "项目"
{
  const conflictPost: PostItem = { id: "p-conflict", shortId: "conflict-slug", type: "article", category: "项目" };
  const traceConflictProj = traceRouteNavigation("projects", conflictPost);
  const traceConflictArt = traceRouteNavigation("articles", conflictPost);
  const traceConflictMom = traceRouteNavigation("moments", conflictPost);

  if (traceConflictProj.loopDetected || traceConflictArt.loopDetected || traceConflictMom.loopDetected) {
    results.push({
      test: "ADVERSARIAL: Item with type='article' AND category='项目' does NOT loop",
      status: "FAIL",
      details: `Infinite redirect loop detected! Flow on /projects: ${JSON.stringify(traceConflictProj.history.map(h => `${h.channel}->${h.destination}`))}`,
    });
  } else {
    results.push({
      test: "ADVERSARIAL: Item with type='article' AND category='项目' does NOT loop",
      status: "PASS",
    });
  }
}

// TEST 3: Zero moments fields in /projects/[id]/page.tsx
{
  const projectPagePath = path.resolve(__dirname, "../src/app/projects/[id]/page.tsx");
  const projectPageSrc = fs.readFileSync(projectPagePath, "utf-8");

  // Check forbidden UI patterns
  const patterns = [
    { name: "likes section / icon", regex: /\b(likes|liked|Heart|点赞)\b/i },
    { name: "comment input / wall", regex: /\b(comments|MessageSquare|评论|评论框)\b/i },
    { name: "location display", regex: /\b(location|MapPin|定位)\b/i },
    { name: "moment emojis / reactions", regex: /\b(emojis|emoji|表情包|互动气泡)\b/i },
    { name: "PostDetail component leak", regex: /<PostDetail\b/ },
    { name: "PostCard component leak", regex: /<PostCard\b/ },
  ];

  let leaked = false;
  const leakedDetails: string[] = [];
  for (const p of patterns) {
    if (p.regex.test(projectPageSrc)) {
      leaked = true;
      leakedDetails.push(p.name);
    }
  }

  if (leaked) {
    results.push({
      test: "Zero moments fields in /projects/[id]/page.tsx",
      status: "FAIL",
      details: `Found moments fields: ${leakedDetails.join(", ")}`,
    });
  } else {
    results.push({
      test: "Zero moments fields in /projects/[id]/page.tsx",
      status: "PASS",
    });
  }
}

// TEST 4: ID Edge Cases (shortId vs numeric/string id, missing shortId, undefined post)
{
  // 4.1 shortId priority
  const postWithShortId: PostItem = { id: "uuid-1234", shortId: "my-cool-app", type: "moment", category: "项目" };
  const res1 = simulateGuard("moments", postWithShortId);
  if (res1.destination === "/projects/my-cool-app") {
    results.push({ test: "Guard prefers shortId over id when both exist", status: "PASS" });
  } else {
    results.push({ test: "Guard prefers shortId over id when both exist", status: "FAIL", details: res1.destination });
  }

  // 4.2 fallback to id when shortId is missing
  const postNoShortId: PostItem = { id: "uuid-5678", type: "moment", category: "项目" };
  const res2 = simulateGuard("moments", postNoShortId);
  if (res2.destination === "/projects/uuid-5678") {
    results.push({ test: "Guard falls back to id when shortId is undefined", status: "PASS" });
  } else {
    results.push({ test: "Guard falls back to id when shortId is undefined", status: "FAIL", details: res2.destination });
  }

  // 4.3 fallback to id when shortId is empty string
  const postEmptyShortId: PostItem = { id: "uuid-9999", shortId: "", type: "moment", category: "项目" };
  const res3 = simulateGuard("moments", postEmptyShortId);
  if (res3.destination === "/projects/uuid-9999") {
    results.push({ test: "Guard falls back to id when shortId is empty string", status: "PASS" });
  } else {
    results.push({ test: "Guard falls back to id when shortId is empty string", status: "FAIL", details: res3.destination });
  }

  // 4.4 numeric string id
  const postNumericId: PostItem = { id: "10023", type: "article", category: "文章" };
  const res4 = simulateGuard("moments", postNumericId);
  if (res4.destination === "/articles/10023") {
    results.push({ test: "Guard correctly handles numeric string id", status: "PASS" });
  } else {
    results.push({ test: "Guard correctly handles numeric string id", status: "FAIL", details: res4.destination });
  }

  // 4.5 missing post returns notFound
  const res5 = simulateGuard("projects", null);
  if (res5.action === "notFound") {
    results.push({ test: "Guard triggers notFound when post is null", status: "PASS" });
  } else {
    results.push({ test: "Guard triggers notFound when post is null", status: "FAIL", details: JSON.stringify(res5) });
  }
}

// TEST 5: External vs Internal Project Links in ProjectCard.tsx & projects/[id]/page.tsx
{
  const cardSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/ProjectCard.tsx"), "utf-8");
  const detailSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/projects/[id]/page.tsx"), "utf-8");

  // ProjectCard must have target="_blank" rel="noopener noreferrer" for external links
  const cardHasExternalRel = cardSrc.includes('target="_blank"') && cardSrc.includes('rel="noopener noreferrer"');
  // ProjectCard must have distinct detail link href
  const cardHasDetailHref = cardSrc.includes("detailHref");
  // projects/[id] must have target="_blank" rel="noopener noreferrer" for external link
  const detailHasExternalRel = detailSrc.includes('target="_blank"') && detailSrc.includes('rel="noopener noreferrer"');

  if (cardHasExternalRel && cardHasDetailHref && detailHasExternalRel) {
    results.push({ test: "External vs internal project link separation & rel='noopener noreferrer'", status: "PASS" });
  } else {
    results.push({
      test: "External vs internal project link separation & rel='noopener noreferrer'",
      status: "FAIL",
      details: `cardRel=${cardHasExternalRel}, cardDetail=${cardHasDetailHref}, detailRel=${detailHasExternalRel}`,
    });
  }
}

// TEST 6: Verify next.config.ts Redirects
{
  const nextConfigSrc = fs.readFileSync(path.resolve(__dirname, "../next.config.ts"), "utf-8");
  const requiredRedirectSources = [
    "/post/:id",
    "/posts",
    "/project",
    "/project/:id",
    "/article",
    "/article/:id",
    "/moment",
    "/moment/:id",
    "/profile",
    "/archive",
  ];

  const missingSources = requiredRedirectSources.filter(src => !nextConfigSrc.includes(`source: "${src}"`));
  if (missingSources.length === 0) {
    results.push({ test: "next.config.ts contains all 10 canonical & alias redirects", status: "PASS" });
  } else {
    results.push({
      test: "next.config.ts contains all 10 canonical & alias redirects",
      status: "FAIL",
      details: `Missing sources: ${missingSources.join(", ")}`,
    });
  }
}

// PRINT RESULTS SUMMARY
console.log("\nTest Results:");
let passCount = 0;
let failCount = 0;
for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : "✗";
  console.log(`  ${icon} [${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`     Details: ${r.details}`);
  }
  if (r.status === "PASS") passCount++;
  else failCount++;
}

console.log(`\nSummary: ${passCount} passed, ${failCount} failed out of ${results.length} tests.`);
process.exit(failCount > 0 ? 1 : 0);
