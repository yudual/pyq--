/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Canonical Routes Verification (F1, F2, F3)
 * Derived from ORIGINAL_REQUEST.md §R1 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 1: Article Canonical Routes (/articles, /articles/[id])", () => {
  test("F1.1: src/app/articles/page.tsx exists and is a valid Next.js App Router page", () => {
    const exists = helpers.fileExists("src/app/articles/page.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/app/articles/page.tsx");
    expect(content).toMatch(/export\s+default\s+(async\s+)?function/);
  });

  test("F1.2: src/app/articles/[id]/page.tsx exists and handles dynamic route param", () => {
    const exists = helpers.fileExists("src/app/articles/[id]/page.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/app/articles/[id]/page.tsx");
    expect(content).toMatch(/params/);
    expect(content).toMatch(/ArticleReader|getPost/);
  });

  test("F1.3: Canonical resolution maps article post with shortId to /articles/[shortId]", () => {
    const post = {
      id: "uuid-art-101",
      shortId: "deep-dive-ai",
      type: "article",
      category: "文章",
    };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.url).toBe("/articles/deep-dive-ai");
    expect(resolved.channel).toBe("articles");
    expect(resolved.type).toBe("internal");
  });

  test("F1.4: Canonical resolution maps article post with ID (no shortId) to /articles/[id]", () => {
    const post = {
      id: "raw-uuid-202",
      type: "article",
      category: "文章",
    };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.url).toBe("/articles/raw-uuid-202");
    expect(resolved.channel).toBe("articles");
  });

  test("F1.5: Article detail page container isolates article reading from moment stream logic", () => {
    const content = helpers.readFile("src/app/articles/[id]/page.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("ActionMenu");
    expect(content).toNotContain("InteractionBubble");
  });
}, { feature: "F1", milestone: "M1", tier: 1 });

describe("Tier 1 - Feature 2: Project Canonical Routes & Split (/projects, /projects/[id])", () => {
  test("F2.1: src/app/projects/page.tsx exists and is a valid Next.js App Router page", () => {
    const exists = helpers.fileExists("src/app/projects/page.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/app/projects/page.tsx");
    expect(content).toMatch(/export\s+default\s+(async\s+)?function/);
  });

  test("F2.2: Independent project detail route src/app/projects/[id]/page.tsx exists", () => {
    const exists = helpers.fileExists("src/app/projects/[id]/page.tsx");
    expect(exists).toBe(true);
    if (exists) {
      const content = helpers.readFile("src/app/projects/[id]/page.tsx");
      expect(content).toMatch(/export\s+default\s+(async\s+)?function/);
    }
  });

  test("F2.3: Canonical resolution maps internal project to /projects/[shortId || id]", () => {
    const post = {
      id: "uuid-prj-301",
      shortId: "my-react-toolkit",
      category: "项目",
      type: "moment",
    };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.url).toBe("/projects/my-react-toolkit");
    expect(resolved.channel).toBe("projects");
    expect(resolved.type).toBe("internal");
  });

  test("F2.4: Canonical resolution preserves external repository/demo URL for projects with linkCard", () => {
    const post = {
      id: "uuid-prj-302",
      shortId: "open-source-app",
      category: "项目",
      linkCard: {
        url: "https://github.com/developer/open-source-app",
      },
    };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.type).toBe("external");
    expect(resolved.url).toBe("https://github.com/developer/open-source-app");
    expect(resolved.internalFallback).toBe("/projects/open-source-app");
  });

  test("F2.5: ProjectCard navigation contract does NOT hardcode href to /moments/[id]", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    // Must not route project detail to moments
    expect(content).toNotContain('const detailHref = `/moments/');
  });
}, { feature: "F2", milestone: "M1", tier: 1 });

describe("Tier 1 - Feature 3: Moments Canonical Routes & Isolation (/moments, /moments/[id])", () => {
  test("F3.1: src/app/moments/page.tsx exists and is a valid Next.js App Router page", () => {
    const exists = helpers.fileExists("src/app/moments/page.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/app/moments/page.tsx");
    expect(content).toMatch(/export\s+default\s+(async\s+)?function/);
  });

  test("F3.2: src/app/moments/[id]/page.tsx exists and is a valid Next.js App Router page", () => {
    const exists = helpers.fileExists("src/app/moments/[id]/page.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/app/moments/[id]/page.tsx");
    expect(content).toMatch(/export\s+default\s+(async\s+)?function/);
  });

  test("F3.3: Canonical resolution maps moment post to /moments/[shortId || id]", () => {
    const post = {
      id: "uuid-mom-401",
      shortId: "sunny-day-coffee",
      type: "moment",
      category: "生活",
    };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.url).toBe("/moments/sunny-day-coffee");
    expect(resolved.channel).toBe("moments");
  });

  test("F3.4: Moment detail page contains back navigation returning to /moments channel", () => {
    const content = helpers.readFile("src/app/moments/[id]/page.tsx");
    expect(content).toBeDefined();
    // Must contain back button / link to /moments
    const hasBackNav = content.includes("/moments") || content.includes("ArrowLeft") || content.includes("router.back");
    expect(hasBackNav).toBe(true);
  });

  test("F3.5: Moments detail page delegates social interaction specifically to PostDetail", () => {
    const content = helpers.readFile("src/app/moments/[id]/page.tsx");
    expect(content).toMatch(/<PostDetail\s+post=\{post\}/);
  });
}, { feature: "F3", milestone: "M1", tier: 1 });
