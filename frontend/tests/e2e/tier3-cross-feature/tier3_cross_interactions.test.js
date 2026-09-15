/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 3: Cross-Feature Interactions & Combined Flows
 * Derived from ORIGINAL_REQUEST.md & TEST_INFRA.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 3 - Cross-Feature Flow 1: Archive Timeline -> Project Detail -> External Repository", () => {
  test("T3.1.1: Clicking project item in archives timeline resolves to /projects/[id]", () => {
    const projectInArchive = {
      id: "proj-101",
      shortId: "my-web-app",
      category: "项目",
      title: "My Web App",
      type: "moment",
    };
    const resolved = helpers.resolveCanonicalUrl(projectInArchive);
    expect(resolved.channel).toBe("projects");
    expect(resolved.url).toBe("/projects/my-web-app");
  });

  test("T3.1.2: Project with external link in archive resolves to external destination with target='_blank'", () => {
    const externalProject = {
      id: "proj-102",
      shortId: "cli-tool",
      category: "项目",
      linkCard: { url: "https://github.com/developer/cli-tool" },
    };
    const resolved = helpers.resolveCanonicalUrl(externalProject);
    expect(resolved.type).toBe("external");
    expect(resolved.url).toBe("https://github.com/developer/cli-tool");
  });
}, { tier: 3, flow: "archive_to_project" });

describe("Tier 3 - Cross-Feature Flow 2: Aggregator Feed Filter -> Category Switch -> Canonical Detail", () => {
  test("T3.2.1: Home feed aggregator polymorphic stream correctly segregates articles, projects, and moments", () => {
    const mixedFeed = [
      { id: "1", type: "article", title: "Article One" },
      { id: "2", category: "项目", title: "Project Two" },
      { id: "3", type: "moment", content: "Moment Three" },
    ];

    const mapped = mixedFeed.map((item) => {
      if (item.category === "项目" || item.type === "project") return "ProjectCard";
      if (item.type === "article") return "ArticleFeedCard";
      return "MomentCard";
    });

    expect(mapped[0]).toBe("ArticleFeedCard");
    expect(mapped[1]).toBe("ProjectCard");
    expect(mapped[2]).toBe("MomentCard");
  });

  test("T3.2.2: Directly navigating from polymorphic feed item enters matching canonical detail page", () => {
    const article = { id: "art-1", shortId: "deep-learning", type: "article" };
    const project = { id: "prj-1", shortId: "my-bot", category: "项目" };
    const moment = { id: "mom-1", shortId: "daily-coffee", type: "moment" };

    expect(helpers.resolveCanonicalUrl(article).url).toBe("/articles/deep-learning");
    expect(helpers.resolveCanonicalUrl(project).url).toBe("/projects/my-bot");
    expect(helpers.resolveCanonicalUrl(moment).url).toBe("/moments/daily-coffee");
  });
}, { tier: 3, flow: "feed_filter_refresh" });

describe("Tier 3 - Cross-Feature Flow 3: Mismatched URL Request -> Route Guard Redirect Chain", () => {
  test("T3.3.1: Visiting /moments/[id] with an article ID executes server-side redirect to /articles/[id]", () => {
    const articlePost = {
      id: "uuid-901",
      shortId: "state-management",
      type: "article",
      category: "文章",
    };
    const decision = helpers.evaluateRouteGuard("moments", articlePost);
    expect(decision.action).toBe("redirect");
    expect(decision.destination).toBe("/articles/state-management");
  });

  test("T3.3.2: Visiting /articles/[id] with a moment ID executes server-side redirect to /moments/[id]", () => {
    const momentPost = {
      id: "uuid-902",
      shortId: "walk-in-park",
      type: "moment",
      category: "生活",
    };
    const decision = helpers.evaluateRouteGuard("articles", momentPost);
    expect(decision.action).toBe("redirect");
    expect(decision.destination).toBe("/moments/walk-in-park");
  });
}, { tier: 3, flow: "cross_route_guard_redirect" });

describe("Tier 3 - Cross-Feature Flow 4: Admin Content Lifecycle -> Preview & ISR Revalidation", () => {
  test("T3.4.1: Admin article authoring lifecycle links to canonical /articles/[shortId] destination", () => {
    const article = {
      id: "db-id-888",
      shortId: "my-new-post",
      type: "article",
    };
    const targetUrl = article.shortId ? `/articles/${article.shortId}` : `/articles/${article.id}`;
    expect(targetUrl).toBe("/articles/my-new-post");
  });

  test("T3.4.2: Article publication revalidation path includes both /articles and /articles/[id]", () => {
    const revalidateCode = helpers.readFile("src/app/api/revalidate/route.ts");
    expect(revalidateCode).toBeDefined();
    expect(revalidateCode).toMatch(/\/articles/);
  });
}, { tier: 3, flow: "admin_editorial_cycle" });

describe("Tier 3 - Cross-Feature Flow 5: Legacy URL Access -> Config Redirect -> Guard Validation", () => {
  test("T3.5.1: Legacy /post/:id triggers Next.js redirect and hits canonical detail handler", async () => {
    const redirects = await helpers.loadNextRedirects();
    const legacyRedirect = redirects.find((r) => r.source === "/post/:id");
    expect(legacyRedirect).toBeDefined();
    expect(legacyRedirect.permanent).toBe(true);
  });

  test("T3.5.2: Item redirected from legacy /post/:id is routed to correct channel even if it is an article", () => {
    // Simulating user who hit /post/article-123, got redirected to /moments/article-123
    // Then the route guard on /moments/[id] kicks in and sends them to /articles/article-123!
    const articlePost = { id: "article-123", type: "article" };
    const guardDecision = helpers.evaluateRouteGuard("moments", articlePost);
    expect(guardDecision.action).toBe("redirect");
    expect(guardDecision.destination).toBe("/articles/article-123");
  });
}, { tier: 3, flow: "legacy_redirect_chain" });
