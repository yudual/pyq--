/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Archives & About Canonicalization Verification (F5)
 * Derived from ORIGINAL_REQUEST.md §R1 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 5: Archives & About Canonicalization", () => {
  test("F5.1: src/app/archives/page.tsx exists and acts strictly as timeline index locator", () => {
    const exists = helpers.fileExists("src/app/archives/page.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/app/archives/page.tsx");
    expect(content).toMatch(/ProfileTimeline/);
    expect(content).toNotContain("ArticleReader");
  });

  test("F5.2: ProfilePostCard routes articles to canonical /articles/[id]", () => {
    const content = helpers.readFile("src/components/profile/ProfilePostCard.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/post\.type === "article"[\s\S]*?\/articles\//);
  });

  test("F5.3: ProfilePostCard routes projects (category === '项目') to canonical /projects/[id]", () => {
    const content = helpers.readFile("src/components/profile/ProfilePostCard.tsx");
    expect(content).toBeDefined();
    // Must distinguish project category and route to /projects/
    const routesProjects = content.includes("/projects/") &&
      (content.includes('post.category === "项目"') || content.includes('category === "项目"'));
    expect(routesProjects).toBe(true);
  });

  test("F5.4: ProfilePostCard routes moments to canonical /moments/[id]", () => {
    const content = helpers.readFile("src/components/profile/ProfilePostCard.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/\/moments\//);
  });

  test("F5.5: ProfilePostCard applies line-clamp truncation to timeline dynamic content snippets", () => {
    const content = helpers.readFile("src/components/profile/ProfilePostCard.tsx");
    expect(content).toBeDefined();
    // Must contain line-clamp utility to avoid rendering unlimited long texts
    expect(content).toMatch(/line-clamp/);
  });

  test("F5.6: src/app/about/page.tsx exists and focuses cleanly on personal and site intro", () => {
    const exists = helpers.fileExists("src/app/about/page.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/app/about/page.tsx");
    expect(content).toMatch(/AboutReader/);
  });
}, { feature: "F5", milestone: "M1", tier: 1 });
