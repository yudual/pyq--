/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Navigation Closure & Link Security Verification (F7, F8)
 * Derived from ORIGINAL_REQUEST.md §R2 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 7: Global Navigation Closure", () => {
  test("F7.1: HeroSection uses Next.js Link for internal /articles CTA (no raw <a>)", () => {
    const content = helpers.readFile("src/components/home/HeroSection.tsx");
    expect(content).toBeDefined();
    // Must not use raw <a href="/articles" which causes full page reload
    expect(content).toNotContain('<a\n            href="/articles"');
    expect(content).toNotContain('<a href="/articles"');
    expect(content).toMatch(/<Link[\s\S]*?href="\/articles"/);
  });

  test("F7.2: Article detail page includes back navigation returning to /articles", () => {
    const content = helpers.readFile("src/app/articles/[id]/page.tsx");
    expect(content).toBeDefined();
    const hasBackNav = content.includes("/articles") || content.includes("ArrowLeft") || content.includes("router.back");
    expect(hasBackNav).toBe(true);
  });

  test("F7.3: Moments detail page includes back navigation returning to /moments", () => {
    const content = helpers.readFile("src/app/moments/[id]/page.tsx");
    expect(content).toBeDefined();
    const hasBackNav = content.includes("/moments") || content.includes("ArrowLeft") || content.includes("router.back");
    expect(hasBackNav).toBe(true);
  });

  test("F7.4: Global navigation bar (FloatingNav) contains canonical channel navigation links", () => {
    const content = helpers.readFile("src/components/navigation/FloatingNav.tsx") ||
      helpers.readFile("src/components/TopBar.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/\/articles/);
    expect(content).toMatch(/\/projects/);
    expect(content).toMatch(/\/moments/);
  });

  test("F7.5: SpecialPageLayout preserves brand navigation closure across sub-channels", () => {
    const content = helpers.readFile("src/components/SpecialPageLayout.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/<Link[\s\S]*?href="\/"/);
  });
}, { feature: "F7", milestone: "M3", tier: 1 });

describe("Tier 1 - Feature 8: Strict Link Security (target='_blank' rel='noopener noreferrer')", () => {
  test("F8.1: HeroSection external social links specify rel='noopener noreferrer'", () => {
    const content = helpers.readFile("src/components/home/HeroSection.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/rel="noopener noreferrer"/);
  });

  test("F8.2: ProjectCard external link specifies both target='_blank' and rel containing 'noopener noreferrer'", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    // Must have rel="noopener noreferrer", not just "noreferrer"
    expect(content).toNotContain('rel="noreferrer"');
    expect(content).toMatch(/rel="noopener noreferrer"|rel="noreferrer noopener"/);
  });

  test("F8.3: Admin articles view external links specify rel='noopener noreferrer'", () => {
    const content = helpers.readFile("src/app/admin/articles/page.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/target="_blank"[\s\S]*?rel="noopener noreferrer"|rel="noopener noreferrer"[\s\S]*?target="_blank"/);
  });

  test("F8.4: AdminLayoutClient site entrance link specifies rel='noopener noreferrer'", () => {
    const content = helpers.readFile("src/app/admin/AdminLayoutClient.tsx");
    expect(content).toBeDefined();
    if (content.includes('target="_blank"')) {
      expect(content).toMatch(/rel="noopener noreferrer"/);
    } else {
      expect(true).toBe(true);
    }
  });

  test("F8.5: Internal route links in main components do not specify target='_blank'", () => {
    const topBarContent = helpers.readFile("src/components/TopBar.tsx");
    expect(topBarContent).toBeDefined();
    // Top bar internal links should not open in new tab
    expect(topBarContent).toNotMatch(/href="\/articles"[\s\S]*?target="_blank"/);
    expect(topBarContent).toNotMatch(/href="\/projects"[\s\S]*?target="_blank"/);
  });
}, { feature: "F8", milestone: "M3", tier: 1 });
