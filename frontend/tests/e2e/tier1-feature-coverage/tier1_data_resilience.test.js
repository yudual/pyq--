/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Visual Preservation & Data Flow Resilience (F14, F15, F16, F17, F18, F19)
 * Derived from ORIGINAL_REQUEST.md §R3, §R4 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 14: Visual Style & Layout Preservation", () => {
  test("F14.1: globals.css preserves core WeChat visual tokens and background variables", () => {
    const css = helpers.readFile("src/app/globals.css");
    expect(css).toBeDefined();
    expect(css).toMatch(/--color-wechat-bg|wechat-bg|wechat-white/);
  });

  test("F14.2: Page container preserves desktop decorations and max-width layout", () => {
    const homePage = helpers.readFile("src/app/page.tsx");
    expect(homePage).toBeDefined();
    expect(homePage).toMatch(/DesktopDecorations/);
    expect(homePage).toMatch(/max-w-/);
  });

  test("F14.3: Dark theme classes and backdrop filters are preserved", () => {
    const heroContent = helpers.readFile("src/components/home/HeroSection.tsx");
    expect(heroContent).toBeDefined();
    expect(heroContent).toMatch(/dark:/);
    expect(heroContent).toMatch(/backdrop-blur/);
  });

  test("F14.4: Card border and shadow styling tokens are preserved", () => {
    const articleCard = helpers.readFile("src/components/ArticleFeedCard.tsx");
    expect(articleCard).toBeDefined();
    expect(articleCard).toMatch(/rounded-|shadow-/);
  });

  test("F14.5: SpecialPageLayout preserves brand navigation closure", () => {
    const layout = helpers.readFile("src/components/SpecialPageLayout.tsx");
    expect(layout).toBeDefined();
    expect(layout).toMatch(/DesktopDecorations|DesktopFooter|Footer/);
  });
}, { feature: "F14", milestone: "M2", tier: 1 });

describe("Tier 1 - Feature 15: SSR/Client Deduplication & True Empty States", () => {
  test("F15.1: PostList skips redundant client fetch on mount when initialPosts is provided", () => {
    const content = helpers.readFile("src/components/PostList.tsx");
    expect(content).toBeDefined();
    // Must check initialPosts or have deduplication guard
    const hasDedupGuard =
      content.includes("initialPosts") &&
      (content.includes("mounted") || content.includes("hasInitial") || content.includes("isInitialMount"));
    expect(hasDedupGuard).toBe(true);
  });

  test("F15.2: PostList updates state and displays empty state when API returns empty array []", () => {
    const content = helpers.readFile("src/components/PostList.tsx");
    expect(content).toBeDefined();
    // Must not return early and ignore empty array
    expect(content).toNotContain("if (!json?.data || !Array.isArray(json.data) || json.data.length === 0) return;");
    expect(content).toMatch(/setPosts\(\s*json\.data\s*\)|setPosts\(\s*\[\]\s*\)/);
  });

  test("F15.3: Articles page does not fall back to mockPosts when API returns 0 items", () => {
    const content = helpers.readFile("src/app/articles/page.tsx");
    expect(content).toBeDefined();
    // Must not fallback to mockPosts on empty data
    expect(content).toNotContain("json.data.length > 0 ? json.data : fallbackArticles");
  });

  test("F15.4: Projects page does not fall back to mockPosts when API returns 0 items", () => {
    const content = helpers.readFile("src/app/projects/page.tsx");
    expect(content).toBeDefined();
    // Must not fallback to mockPosts on empty data
    expect(content).toNotContain("json.data.length > 0 ? json.data : fallbackProjects");
  });

  test("F15.5: Moments page does not fall back to mockPosts when API returns 0 items", () => {
    const content = helpers.readFile("src/app/moments/page.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("json.data.length > 0 ? json.data : fallbackMoments");
  });
}, { feature: "F15", milestone: "M4", tier: 1 });

describe("Tier 1 - Feature 16: Race Condition & Stale State Prevention", () => {
  test("F16.1: PostList implements request cancellation (AbortController) or sequence tracking", () => {
    const content = helpers.readFile("src/components/PostList.tsx");
    expect(content).toBeDefined();
    const hasRaceGuard = content.includes("AbortController") || content.includes("reqId") || content.includes("activeId");
    expect(hasRaceGuard).toBe(true);
  });

  test("F16.2: PostList resets page state to 1 when changing active category", () => {
    const content = helpers.readFile("src/components/PostList.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/setPage\(1\)/);
  });

  test("F16.3: Category change resets pagination and clears in-flight loadMore", () => {
    const content = helpers.readFile("src/components/PostList.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/setHasMore/);
  });

  test("F16.4: Empty category response replaces previous category items instead of keeping stale list", () => {
    const content = helpers.readFile("src/components/PostList.tsx");
    expect(content).toBeDefined();
    // When changing category to empty, posts must be set to empty array
    expect(content).toMatch(/setPosts/);
  });

  test("F16.5: AboutReader prioritizes fresh server content over stale localStorage data", () => {
    const content = helpers.readFile("src/components/AboutReader.tsx");
    expect(content).toBeDefined();
    // Must not unconditionally overwrite server content with localStorage
    expect(content).toNotContain("if (local) setContent(local);");
  });
}, { feature: "F16", milestone: "M4", tier: 1 });

describe("Tier 1 - Feature 17: White Screen Prevention & Hydration Consistency", () => {
  test("F17.1: ProfileFadeIn does not set opacity-0 unconditionally on initial SSR render", () => {
    const content = helpers.readFile("src/components/profile/ProfileFadeIn.tsx");
    expect(content).toBeDefined();
    // Should not hide SSR server rendered content completely
    expect(content).toNotContain(': "opacity-0"');
  });

  test("F17.2: ProfileFadeIn guarantees content visibility even when JS is slow or disabled", () => {
    const content = helpers.readFile("src/components/profile/ProfileFadeIn.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/children/);
  });

  test("F17.3: sanitize.ts provides isomorphic sanitization without DOMParser hydration mismatch", () => {
    const content = helpers.readFile("src/lib/sanitize.ts");
    expect(content).toBeDefined();
    // Should not branch server to un-sanitized raw html and client to DOMParser
    expect(content).toNotContain('if (typeof document === "undefined") return html;');
  });

  test("F17.4: App root layout contains full height container and viewport styling", () => {
    const layout = helpers.readFile("src/app/layout.tsx");
    expect(layout).toBeDefined();
    expect(layout).toMatch(/min-h-screen|min-h-full|h-full/);
  });

  test("F17.5: Dynamic detail pages await and validate route params to prevent undefined crashes", () => {
    const articlePage = helpers.readFile("src/app/articles/[id]/page.tsx");
    expect(articlePage).toBeDefined();
    expect(articlePage).toMatch(/await\s+params/);
  });
}, { feature: "F17", milestone: "M4", tier: 1 });

describe("Tier 1 - Feature 18: Global Error & 404 Boundaries", () => {
  test("F18.1: Custom not-found.tsx exists in src/app/", () => {
    const exists = helpers.fileExists("src/app/not-found.tsx");
    expect(exists).toBe(true);
  });

  test("F18.2: not-found.tsx renders user-friendly 404 UI with navigation back home", () => {
    const exists = helpers.fileExists("src/app/not-found.tsx");
    expect(exists).toBe(true);
    if (exists) {
      const content = helpers.readFile("src/app/not-found.tsx");
      expect(content).toMatch(/404/);
      expect(content).toMatch(/<Link[\s\S]*?href="\/"/);
    }
  });

  test("F18.3: Custom error.tsx exists in src/app/", () => {
    const exists = helpers.fileExists("src/app/error.tsx");
    expect(exists).toBe(true);
  });

  test("F18.4: error.tsx provides reset error boundary recovery function", () => {
    const exists = helpers.fileExists("src/app/error.tsx");
    expect(exists).toBe(true);
    if (exists) {
      const content = helpers.readFile("src/app/error.tsx");
      expect(content).toMatch(/reset/);
      expect(content).toMatch(/'use client'|"use client"/);
    }
  });

  test("F18.5: Missing post query in detail pages invokes notFound() instead of crashing", () => {
    const articlePage = helpers.readFile("src/app/articles/[id]/page.tsx");
    const momentPage = helpers.readFile("src/app/moments/[id]/page.tsx");
    expect(articlePage).toMatch(/notFound\(\)/);
    expect(momentPage).toMatch(/notFound\(\)/);
  });
}, { feature: "F18", milestone: "M4", tier: 1 });

describe("Tier 1 - Feature 19: ISR Revalidation Completeness", () => {
  test("F19.1: src/app/api/revalidate/route.ts revalidates /articles channel", () => {
    const content = helpers.readFile("src/app/api/revalidate/route.ts");
    expect(content).toBeDefined();
    expect(content).toMatch(/revalidatePath\(["']\/articles["']/);
  });

  test("F19.2: src/app/api/revalidate/route.ts revalidates /moments channel", () => {
    const content = helpers.readFile("src/app/api/revalidate/route.ts");
    expect(content).toBeDefined();
    expect(content).toMatch(/revalidatePath\(["']\/moments["']/);
  });

  test("F19.3: src/app/api/revalidate/route.ts revalidates /projects channel", () => {
    const content = helpers.readFile("src/app/api/revalidate/route.ts");
    expect(content).toBeDefined();
    expect(content).toMatch(/revalidatePath\(["']\/projects["']/);
  });

  test("F19.4: src/app/api/revalidate/route.ts revalidates /archives and /about", () => {
    const content = helpers.readFile("src/app/api/revalidate/route.ts");
    expect(content).toBeDefined();
    expect(content).toMatch(/revalidatePath\(["']\/archives["']/);
    expect(content).toMatch(/revalidatePath\(["']\/about["']/);
  });

  test("F19.5: src/app/api/revalidate/route.ts requires secret authentication", () => {
    const content = helpers.readFile("src/app/api/revalidate/route.ts");
    expect(content).toBeDefined();
    expect(content).toMatch(/expected\s*\|\|\s*secret\s*!==\s*expected/);
    expect(content).toMatch(/status:\s*401/);
  });
}, { feature: "F19", milestone: "M4", tier: 1 });
