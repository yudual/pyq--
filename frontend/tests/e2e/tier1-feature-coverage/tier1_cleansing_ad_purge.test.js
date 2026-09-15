/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Moments Field Cleansing & Complete Ad Purge (F12, F13)
 * Derived from ORIGINAL_REQUEST.md §R3 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 12: Moments Field Cleansing from Projects & Articles", () => {
  test("F12.1: ProjectCard contains no moment like counters or heart icons", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("likeCount");
    expect(content).toNotContain("post.likes");
    expect(content).toNotContain("Heart");
  });

  test("F12.2: ProjectCard contains no moment comment bubble popups or emoji pickers", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("CommentSection");
    expect(content).toNotContain("emoji");
  });

  test("F12.3: ProjectCard contains no WeChat moment location tags", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("post.location");
  });

  test("F12.4: ArticleFeedCard contains no WeChat moment interaction bubbles or action menu", () => {
    const content = helpers.readFile("src/components/ArticleFeedCard.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("ActionMenu");
    expect(content).toNotContain("InteractionBubble");
  });

  test("F12.5: Project presentation focuses purely on title, tags, description, and preview", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/title/);
    expect(content).toMatch(/tags/);
    expect(content).toMatch(/description/);
  });
}, { feature: "F12", milestone: "M2", tier: 1 });

describe("Tier 1 - Feature 13: Complete Ad Code & Field Purge (0 remnants)", () => {
  test("F13.1: Frontend source directory contains 0 occurrences of 'is_ad'", () => {
    const matches = helpers.scanForAdKeywords(helpers.getSrcPath()).filter((m) => m.keyword === "is_ad");
    expect(matches.length).toBe(0);
  });

  test("F13.2: Frontend source directory contains 0 occurrences of 'ad_avatar'", () => {
    const matches = helpers.scanForAdKeywords(helpers.getSrcPath()).filter((m) => m.keyword === "ad_avatar");
    expect(matches.length).toBe(0);
  });

  test("F13.3: Frontend source directory contains 0 occurrences of 'ad_nickname'", () => {
    const matches = helpers.scanForAdKeywords(helpers.getSrcPath()).filter((m) => m.keyword === "ad_nickname");
    expect(matches.length).toBe(0);
  });

  test("F13.4: Frontend source directory contains 0 occurrences of 'ad_on_archives'", () => {
    const matches = helpers.scanForAdKeywords(helpers.getSrcPath()).filter((m) => m.keyword === "ad_on_archives");
    expect(matches.length).toBe(0);
  });

  test("F13.5: Frontend source directory contains 0 occurrences of ad slots or google ads", () => {
    const matches = helpers.scanForAdKeywords(helpers.getSrcPath()).filter(
      (m) => m.keyword === "adslot" || m.keyword === "adcard" || m.keyword === "adsbygoogle"
    );
    expect(matches.length).toBe(0);
  });
}, { feature: "F13", milestone: "M2", tier: 1 });
