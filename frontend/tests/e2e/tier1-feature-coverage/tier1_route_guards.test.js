/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Cross-Channel Route Guards Verification (F4)
 * Derived from ORIGINAL_REQUEST.md §R1 & Survey Routes Report §3
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 4: Cross-Channel Route Guards", () => {
  test("F4.1: Route guard redirects article requested on /moments/[id] to /articles/[id]", () => {
    const post = {
      id: "uuid-001",
      shortId: "my-tech-post",
      type: "article",
      category: "文章",
    };
    const decision = helpers.evaluateRouteGuard("moments", post);
    expect(decision.action).toBe("redirect");
    expect(decision.destination).toBe("/articles/my-tech-post");
    expect(decision.toChannel).toBe("articles");
  });

  test("F4.2: Route guard redirects project requested on /moments/[id] to /projects/[id]", () => {
    const post = {
      id: "uuid-002",
      shortId: "cool-portfolio",
      category: "项目",
      type: "moment",
    };
    const decision = helpers.evaluateRouteGuard("moments", post);
    expect(decision.action).toBe("redirect");
    expect(decision.destination).toBe("/projects/cool-portfolio");
    expect(decision.toChannel).toBe("projects");
  });

  test("F4.3: Route guard redirects moment requested on /articles/[id] to /moments/[id]", () => {
    const post = {
      id: "uuid-003",
      shortId: "coffee-walk",
      type: "moment",
      category: "生活",
    };
    const decision = helpers.evaluateRouteGuard("articles", post);
    expect(decision.action).toBe("redirect");
    expect(decision.destination).toBe("/moments/coffee-walk");
    expect(decision.toChannel).toBe("moments");
  });

  test("F4.4: Route guard redirects project requested on /articles/[id] to /projects/[id]", () => {
    const post = {
      id: "uuid-004",
      shortId: "my-library",
      category: "项目",
      type: "project",
    };
    const decision = helpers.evaluateRouteGuard("articles", post);
    expect(decision.action).toBe("redirect");
    expect(decision.destination).toBe("/projects/my-library");
    expect(decision.toChannel).toBe("projects");
  });

  test("F4.5: Route guard retains correct canonical channel when requesting matching post", () => {
    const articlePost = { id: "a1", shortId: "art-ok", type: "article", category: "文章" };
    const momentPost = { id: "m1", shortId: "mom-ok", type: "moment", category: "日常" };
    const projectPost = { id: "p1", shortId: "prj-ok", category: "项目" };

    const decArticle = helpers.evaluateRouteGuard("articles", articlePost);
    expect(decArticle.action).toBe("render");

    const decMoment = helpers.evaluateRouteGuard("moments", momentPost);
    expect(decMoment.action).toBe("render");

    const decProject = helpers.evaluateRouteGuard("projects", projectPost);
    expect(decProject.action).toBe("render");
  });

  test("F4.6: Server-side detail page source files implement redirect guard logic", () => {
    const momentsDetailCode = helpers.readFile("src/app/moments/[id]/page.tsx");
    const articlesDetailCode = helpers.readFile("src/app/articles/[id]/page.tsx");

    expect(momentsDetailCode).toBeDefined();
    expect(articlesDetailCode).toBeDefined();

    // Source code must contain guard checks for redirecting mismatched types
    const momentsHasGuard = momentsDetailCode.includes("redirect(") &&
      (momentsDetailCode.includes("post.type") || momentsDetailCode.includes("category"));
    const articlesHasGuard = articlesDetailCode.includes("redirect(") &&
      (articlesDetailCode.includes("post.type") || articlesDetailCode.includes("category"));

    expect(momentsHasGuard).toBe(true);
    expect(articlesHasGuard).toBe(true);
  });
}, { feature: "F4", milestone: "M1", tier: 1 });
