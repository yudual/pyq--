/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Next.js Redirects & Dead Routes Verification (F6)
 * Derived from ORIGINAL_REQUEST.md §R1 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 6: Next.js Redirects & Dead Routes", () => {
  test("F6.1: next.config.ts configures /post/:id redirect with permanent: true (308)", async () => {
    const redirects = await helpers.loadNextRedirects();
    const postRedirect = redirects.find((r) => r.source === "/post/:id" || r.source === "/post/:path*");
    expect(postRedirect).toBeDefined();
    expect(postRedirect.permanent).toBe(true);
    expect(postRedirect.destination).toMatch(/\/moments\/|\/articles\//);
  });

  test("F6.2: next.config.ts configures /profile -> /archives redirect with permanent: true", async () => {
    const redirects = await helpers.loadNextRedirects();
    const profileRedirect = redirects.find((r) => r.source === "/profile");
    expect(profileRedirect).toBeDefined();
    expect(profileRedirect.destination).toBe("/archives");
    expect(profileRedirect.permanent).toBe(true);
  });

  test("F6.3: next.config.ts redirects alias /article or /article/:path* to /articles canonical route", async () => {
    const redirects = await helpers.loadNextRedirects();
    const articleAlias = redirects.find((r) =>
      r.source === "/article" || r.source === "/article/:path*" || r.source === "/article/:id"
    );
    expect(articleAlias).toBeDefined();
    expect(articleAlias.destination).toMatch(/\/articles/);
    expect(articleAlias.permanent).toBe(true);
  });

  test("F6.4: next.config.ts redirects alias /project or /project/:path* to /projects canonical route", async () => {
    const redirects = await helpers.loadNextRedirects();
    const projectAlias = redirects.find((r) =>
      r.source === "/project" || r.source === "/project/:path*" || r.source === "/project/:id"
    );
    expect(projectAlias).toBeDefined();
    expect(projectAlias.destination).toMatch(/\/projects/);
    expect(projectAlias.permanent).toBe(true);
  });

  test("F6.5: next.config.ts redirects legacy /posts plural route", async () => {
    const redirects = await helpers.loadNextRedirects();
    const postsAlias = redirects.find((r) => r.source === "/posts" || r.source === "/posts/:path*");
    expect(postsAlias).toBeDefined();
    expect(postsAlias.permanent).toBe(true);
  });
}, { feature: "F6", milestone: "M1", tier: 1 });
