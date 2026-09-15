/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 2: Boundary & Corner Cases - Next.js Redirects & Rewrites
 * Derived from ORIGINAL_REQUEST.md & TEST_INFRA.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 2 - Boundary: Redirects & Status Codes", () => {
  test("T2.3.1: All Next.js canonical redirects configure permanent: true (HTTP 308)", async () => {
    const redirects = await helpers.loadNextRedirects();
    expect(redirects.length).toBeGreaterThan(0);
    redirects.forEach((r) => {
      expect(r.permanent).toBe(true);
    });
  });

  test("T2.3.2: No redirect configuration has identical source and destination (infinite loop check)", async () => {
    const redirects = await helpers.loadNextRedirects();
    redirects.forEach((r) => {
      expect(r.source).toNotContain(r.destination);
    });
  });

  test("T2.3.3: Redirect destinations start with valid absolute path '/'", async () => {
    const redirects = await helpers.loadNextRedirects();
    redirects.forEach((r) => {
      expect(r.destination.startsWith("/")).toBe(true);
    });
  });

  test("T2.3.4: /profile redirect targets exactly /archives without trailing slash ambiguity", async () => {
    const redirects = await helpers.loadNextRedirects();
    const profile = redirects.find((r) => r.source === "/profile");
    expect(profile).toBeDefined();
    expect(profile.destination).toBe("/archives");
  });

  test("T2.3.5: Dynamic parameter :id in /post/:id is correctly forwarded to destination :id", async () => {
    const redirects = await helpers.loadNextRedirects();
    const post = redirects.find((r) => r.source === "/post/:id");
    if (post) {
      expect(post.destination).toContain(":id");
    }
  });

  test("T2.3.6: Rewrites properly forward /api/:path* to BACKEND_URL/api/:path*", () => {
    const configContent = helpers.readFile("next.config.ts");
    expect(configContent).toBeDefined();
    expect(configContent).toMatch(/source:\s*["']\/api\/:path\*["']/);
    expect(configContent).toMatch(/destination:\s*`?\${BACKEND_URL}\/api\/:path\*`?/);
  });
}, { tier: 2, category: "boundary_redirects" });
