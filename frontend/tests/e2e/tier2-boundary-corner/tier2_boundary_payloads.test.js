/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 2: Boundary & Corner Cases - Data Payloads & Field Edge Cases
 * Derived from ORIGINAL_REQUEST.md & TEST_INFRA.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 2 - Boundary: Data Payloads & Field Edge Cases", () => {
  test("T2.2.1: Post with empty string content '' does not crash canonical resolution", () => {
    const post = { id: "p1", type: "article", content: "" };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.url).toBe("/articles/p1");
  });

  test("T2.2.2: Post with null content and null excerpt handles resolution cleanly", () => {
    const post = { id: "p2", type: "article", content: null, excerpt: null };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.url).toBe("/articles/p2");
  });

  test("T2.2.3: Project post with empty string linkCard.url falls back to internal detail route", () => {
    const post = {
      id: "p3",
      category: "项目",
      linkCard: { url: "   " },
    };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.type).toBe("internal");
    expect(resolved.url).toBe("/projects/p3");
  });

  test("T2.2.4: Post with empty images array [] preserves valid structure", () => {
    const post = { id: "p4", type: "moment", images: [] };
    const resolved = helpers.resolveCanonicalUrl(post);
    expect(resolved.url).toBe("/moments/p4");
  });

  test("T2.2.5: Post with massive string content (>20,000 characters) handles URL resolution without memory leak", () => {
    const massiveContent = "Hello World! ".repeat(2000);
    const post = { id: "p5", type: "article", content: massiveContent };
    const t0 = Date.now();
    const resolved = helpers.resolveCanonicalUrl(post);
    const duration = Date.now() - t0;
    expect(resolved.url).toBe("/articles/p5");
    expect(duration).toBeLessThan(100);
  });

  test("T2.2.6: Post with invalid protocol in linkCard url (e.g. javascript:) is not treated as safe external", () => {
    const post = {
      id: "p6",
      category: "项目",
      linkCard: { url: "javascript:alert(1)" },
    };
    const resolved = helpers.resolveCanonicalUrl(post);
    // Should NOT treat unsafe protocols as external link
    expect(resolved.type).toBe("internal");
    expect(resolved.url).toBe("/projects/p6");
  });
}, { tier: 2, category: "boundary_payloads" });
