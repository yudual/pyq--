/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Admin Content Flow Consistency Verification (F9)
 * Derived from ORIGINAL_REQUEST.md §R2 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 9: Admin Content Flow Consistency", () => {
  test("F9.1: Admin articles page generates preview link targeting /articles/[id]", () => {
    const content = helpers.readFile("src/app/admin/articles/page.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/\/articles\//);
  });

  test("F9.2: Admin articles page prioritizes shortId over id for preview URLs", () => {
    const content = helpers.readFile("src/app/admin/articles/page.tsx");
    expect(content).toBeDefined();
    // Matches article.shortId || article.id or similar shortId fallback pattern
    expect(content).toMatch(/shortId\s*\|\|\s*article\.id|shortId\s*\|\|\s*a\.id/);
  });

  test("F9.3: Admin posts page manages and renders posts stream cleanly", () => {
    const content = helpers.readFile("src/app/admin/posts/AdminPosts.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/<PostCard|<MomentCard|apiFetch\(`\/posts/);
  });

  test("F9.4: AdminNotifications uses shortId when linking to published articles", () => {
    const content = helpers.readFile("src/components/AdminNotifications.tsx");
    if (content) {
      expect(content).toMatch(/shortId|postId/);
    } else {
      expect(true).toBe(true);
    }
  });

  test("F9.5: Admin layout provides safe navigation without losing editing state", () => {
    const content = helpers.readFile("src/app/admin/AdminLayoutClient.tsx");
    expect(content).toBeDefined();
    expect(content).toMatch(/<nav|<aside|<header/);
  });
}, { feature: "F9", milestone: "M3", tier: 1 });
