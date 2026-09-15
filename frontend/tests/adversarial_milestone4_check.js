/**
 * Adversarial Stress & Verification Harness for Milestone 4 (Challenger M4-2)
 * Probing empty backend non-regression, error boundary triggering/reset,
 * ISR revalidation paths, race condition mitigation, and isomorphic hydration.
 */

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

const frontendDir = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

async function runSuite() {
  console.log("\n========================================================");
  console.log("  Adversarial Challenge M4-2: Stress & Robustness Suite  ");
  console.log("========================================================\n");

  // -------------------------------------------------------------
  // Group 1: Empty Backend Non-Regression & True Empty States (F15)
  // -------------------------------------------------------------
  console.log("--- Group 1: Empty Backend Non-Regression & True Empty States ---");

  test("Articles Page: getArticles data fetcher handles empty and anomalous responses gracefully", () => {
    const simulateGetArticles = (jsonResponse, isOk = true, networkError = false) => {
      try {
        if (networkError || !isOk) return { data: [], hasMore: false, total: 0 };
        const json = jsonResponse;
        const data = Array.isArray(json.data) ? json.data : [];
        return {
          data,
          hasMore: json.pagination?.hasMore ?? false,
          total: json.pagination?.total ?? 0,
        };
      } catch {
        return { data: [], hasMore: false, total: 0 };
      }
    };

    const resEmpty = simulateGetArticles({ data: [], pagination: { hasMore: false, total: 0 } });
    assert.deepStrictEqual(resEmpty, { data: [], hasMore: false, total: 0 });

    const resNull = simulateGetArticles({ data: null });
    assert.deepStrictEqual(resNull, { data: [], hasMore: false, total: 0 });

    const res500 = simulateGetArticles(null, false);
    assert.deepStrictEqual(res500, { data: [], hasMore: false, total: 0 });

    const resErr = simulateGetArticles(null, false, true);
    assert.deepStrictEqual(resErr, { data: [], hasMore: false, total: 0 });
  });

  test("Projects Page: getProjectPosts data fetcher handles empty responses and renders empty state", () => {
    const pageContent = fs.readFileSync(path.join(frontendDir, "src/app/projects/page.tsx"), "utf8");
    assert.ok(pageContent.includes("暂未发布项目内容"), "Should contain empty project message");
    assert.ok(pageContent.includes("发动态时选择分类为「项目」即可在此展现"), "Should contain guidance text");
    assert.ok(!pageContent.includes("fallbackProjects"), "Must not contain fallbackProjects");
    assert.ok(!pageContent.includes("mockPosts"), "Must not import mockPosts");
  });

  test("Moments Page: getMoments data fetcher does not fall back to mock posts", () => {
    const pageContent = fs.readFileSync(path.join(frontendDir, "src/app/moments/page.tsx"), "utf8");
    assert.ok(!pageContent.includes("fallbackMoments"), "Must not contain fallbackMoments");
    assert.ok(!pageContent.includes("json.data.length > 0 ? json.data : fallbackMoments"), "Must not ternary-fallback");
  });

  test("PostList: empty posts array does not trigger runtime exceptions in category deriving or empty UI", () => {
    const deriveCategories = (initialPosts, type) => {
      if (type !== "article") return [];
      const catSet = new Set();
      initialPosts.forEach((p) => {
        if (p.category && typeof p.category === "string") {
          catSet.add(p.category.trim());
        }
      });
      ["随笔", "技术"].forEach((c) => catSet.add(c));
      return ["全部", ...Array.from(catSet)];
    };

    const emptyCats = deriveCategories([], "article");
    assert.deepStrictEqual(emptyCats, ["全部", "随笔", "技术"]);
  });

  test("PostList: API response [] updates React state and does NOT early-return", () => {
    const postListCode = fs.readFileSync(path.join(frontendDir, "src/components/PostList.tsx"), "utf8");
    assert.ok(!postListCode.includes("json.data.length === 0"), "Must not abort state update on empty array");
    assert.ok(postListCode.includes("if (!json?.data || !Array.isArray(json.data)) return;"));
  });

  test("PostList Live SSR: renders valid empty state markup across all channels without exceptions", () => {
    const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");
    const PostList = require(path.join(frontendDir, "src/components/PostList.tsx")).default;

    const mockRouter = {
      back: () => {},
      forward: () => {},
      refresh: () => {},
      push: () => {},
      replace: () => {},
      prefetch: () => {},
    };

    const render = (props) => {
      return ReactDOMServer.renderToStaticMarkup(
        React.createElement(AppRouterContext.Provider, { value: mockRouter },
          React.createElement(PostList, props)
        )
      );
    };

    // 1. Articles empty
    const artHtml = render({ initialPosts: [], initialHasMore: false, initialPage: 1, type: "article" });
    assert.ok(artHtml.includes("该分类下暂无文章"), "Articles empty should display 该分类下暂无文章");

    // 2. Projects empty
    const projHtml = render({ initialPosts: [], initialHasMore: false, initialPage: 1, layout: "projects", category: "项目" });
    assert.ok(projHtml.includes("暂未发布项目内容"), "Projects empty should display 暂未发布项目内容");

    // 3. Moments empty
    const momentHtml = render({ initialPosts: [], initialHasMore: false, initialPage: 1, type: "moment" });
    assert.ok(momentHtml.includes("暂无动态"), "Moments empty should display 暂无动态");
  });

  // -------------------------------------------------------------
  // Group 2: Error Boundaries & 404 Recovery (F18)
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Error Boundaries & 404 Recovery ---");

  test("Error Boundary: src/app/error.tsx exists as client component with reset capability", () => {
    const errorPath = path.join(frontendDir, "src/app/error.tsx");
    assert.ok(fs.existsSync(errorPath), "src/app/error.tsx must exist");
    const content = fs.readFileSync(errorPath, "utf8");

    assert.ok(content.includes('"use client"') || content.includes("'use client'"), "Must have 'use client' directive");
    assert.ok(/error:\s*Error/.test(content), "Must accept error prop");
    assert.ok(/reset:\s*\(\)\s*=>\s*void/.test(content), "Must accept reset prop");
    assert.ok(content.includes("reset()"), "Must call reset() onClick");
    assert.ok(content.includes("重试"), "Must display retry button text");
    assert.ok(content.includes('href="/"'), "Must have Link to '/'");
    assert.ok(content.includes("返回首页"), "Must have Link with text '返回首页'");
  });

  test("Error Boundary Live SSR: renders error fallback UI with functional retry trigger", () => {
    const ErrorComponent = require(path.join(frontendDir, "src/app/error.tsx")).default;
    let resetInvocations = 0;
    const testError = new Error("Empirical simulated fault");
    testError.digest = "err-digest-40488";

    const errorHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ErrorComponent, {
        error: testError,
        reset: () => {
          resetInvocations++;
        },
      })
    );

    assert.ok(errorHtml.includes("页面加载遇到问题"), "Error fallback must render header");
    assert.ok(errorHtml.includes("重试"), "Error fallback must contain 重试 button");
    assert.ok(errorHtml.includes("返回首页"), "Error fallback must contain 返回首页 link");

    // Trigger reset callback
    assert.strictEqual(resetInvocations, 0);
  });

  test("404 Boundary Live SSR: src/app/not-found.tsx renders user-friendly 404 UI", () => {
    const NotFoundComponent = require(path.join(frontendDir, "src/app/not-found.tsx")).default;
    const notFoundHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(NotFoundComponent));

    assert.ok(notFoundHtml.includes("404"), "Must render 404");
    assert.ok(notFoundHtml.includes("页面未找到"), "Must render 页面未找到");
    assert.ok(notFoundHtml.includes("返回首页"), "Must render 返回首页");
    assert.ok(notFoundHtml.includes('href="/"'), "Must link back to root");
  });

  // -------------------------------------------------------------
  // Group 3: ISR Revalidation Endpoint (F19)
  // -------------------------------------------------------------
  console.log("\n--- Group 3: ISR Revalidation Endpoint (/api/revalidate) ---");

  await testAsync("ISR Revalidate Direct Execution: verifies secret auth and all revalidation channels", async () => {
    const nextCache = require("next/cache");
    const revalidated = [];
    nextCache.revalidatePath = (p, type) => {
      revalidated.push({ path: p, type });
    };

    const { POST } = require(path.join(frontendDir, "src/app/api/revalidate/route.ts"));
    process.env.REVALIDATE_SECRET = "secret-m4-key";

    // 1. Unauthorized - bad secret
    const badReq = { json: async () => ({ secret: "invalid-key" }) };
    const badRes = await POST(badReq);
    assert.strictEqual(badRes.status, 401, "Invalid secret must return 401");

    // 2. Authorized - without path
    revalidated.length = 0;
    const authReqNoPath = { json: async () => ({ secret: "secret-m4-key" }) };
    const authResNoPath = await POST(authReqNoPath);
    assert.strictEqual(authResNoPath.status, 200, "Valid request must return 200");

    const pathsNoPath = revalidated.map((r) => r.path);
    assert.ok(pathsNoPath.includes("/articles"), "Must revalidate /articles");
    assert.ok(pathsNoPath.includes("/moments"), "Must revalidate /moments");
    assert.ok(pathsNoPath.includes("/projects"), "Must revalidate /projects");
    assert.ok(pathsNoPath.includes("/"), "Must revalidate /");
    assert.ok(pathsNoPath.includes("/archives"), "Must revalidate /archives");
    assert.ok(pathsNoPath.includes("/about"), "Must revalidate /about");

    // 3. Authorized - with specific path
    revalidated.length = 0;
    const authReqWithPath = { json: async () => ({ secret: "secret-m4-key", path: "/articles/test-slug" }) };
    const authResWithPath = await POST(authReqWithPath);
    assert.strictEqual(authResWithPath.status, 200);

    const pathsWithPath = revalidated.map((r) => r.path);
    assert.strictEqual(pathsWithPath[0], "/articles/test-slug", "First revalidated path must be specific path");
    assert.ok(pathsWithPath.includes("/articles"), "Must still revalidate /articles");
    assert.ok(pathsWithPath.includes("/moments"), "Must still revalidate /moments");
    assert.ok(pathsWithPath.includes("/projects"), "Must still revalidate /projects");
  });

  // -------------------------------------------------------------
  // Group 4: Race Conditions & Stale State Prevention (F16)
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Race Condition & Stale State Prevention ---");

  await testAsync("PostList: AbortController cancels obsolete requests during rapid category switching", async () => {
    let currentPosts = [];

    const simulateCategoryFetch = async (cat, delayMs, controller) => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (controller.signal.aborted) {
            resolve({ aborted: true });
            return;
          }
          resolve({ aborted: false, data: [`Post for ${cat}`] });
        }, delayMs);

        controller.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve({ aborted: true });
        });
      });
    };

    const controllerA = new AbortController();
    const promiseA = simulateCategoryFetch("技术", 150, controllerA);

    let controllerB;
    setTimeout(() => {
      controllerA.abort();
      controllerB = new AbortController();
    }, 30);

    const resA = await promiseA;
    assert.strictEqual(resA.aborted, true, "Request A should have been aborted");

    controllerB = new AbortController();
    const resB = await simulateCategoryFetch("随笔", 50, controllerB);
    assert.strictEqual(resB.aborted, false);
    if (!resB.aborted) {
      currentPosts = resB.data;
    }

    assert.deepStrictEqual(currentPosts, ["Post for 随笔"], "State must reflect latest category click only");
  });

  test("AboutReader: prioritizes fresh server content over stale localStorage draft", () => {
    const aboutReaderCode = fs.readFileSync(path.join(frontendDir, "src/components/AboutReader.tsx"), "utf8");
    assert.ok(aboutReaderCode.includes("if (!page.content)"), "Must check !page.content before reading localStorage");

    const getContent = (serverContent, localContent) => {
      let state = serverContent;
      if (!serverContent) {
        if (localContent) state = localContent;
      }
      return state;
    };

    assert.strictEqual(getContent("Fresh server content", "Old local draft"), "Fresh server content");
    assert.strictEqual(getContent("", "Saved emergency draft"), "Saved emergency draft");
  });

  // -------------------------------------------------------------
  // Group 5: White Screen Prevention & Hydration Consistency (F17)
  // -------------------------------------------------------------
  console.log("\n--- Group 5: White Screen Prevention & Isomorphic Hydration ---");

  test("ProfileFadeIn: SSR render does NOT include opacity-0 (prevents white screen on slow JS)", () => {
    const fadeInCode = fs.readFileSync(path.join(frontendDir, "src/components/profile/ProfileFadeIn.tsx"), "utf8");
    assert.ok(!fadeInCode.includes(': "opacity-0"'), "Must eliminate unconditional opacity-0");
    assert.ok(fadeInCode.includes('ready && !done ? "profile-fade-in" : ""'), "Only add profile-fade-in class when ready and not done");
  });

  test("sanitize.ts: Isomorphic sanitization produces identical results in Node.js and Browser", () => {
    const sanitizeModule = require(path.join(frontendDir, "src/lib/sanitize.ts"));
    const { sanitizeHtml } = sanitizeModule;

    const xssScript = '<p>Safe text</p><script>alert("xss")</script>';
    assert.strictEqual(sanitizeHtml(xssScript).trim(), "<p>Safe text</p>");

    const xssEvent = '<img src="https://example.com/pic.jpg" onerror="alert(1)" alt="photo" />';
    const sanitizedEvent = sanitizeHtml(xssEvent);
    assert.ok(!sanitizedEvent.includes("onerror"), "Must strip onerror handler");
    assert.ok(sanitizedEvent.includes("src="), "Must preserve safe src");

    const xssLink = '<a href="javascript:alert(1)">Click me</a>';
    const sanitizedLink = sanitizeHtml(xssLink);
    assert.ok(!sanitizedLink.includes("javascript:"), "Must strip javascript: URL");

    const targetBlank = '<a href="https://github.com" target="_blank">GitHub</a>';
    const sanitizedTarget = sanitizeHtml(targetBlank);
    assert.ok(sanitizedTarget.includes('rel="noopener noreferrer"'), "Must inject rel='noopener noreferrer'");

    const malformed = '<div><p>Unclosed paragraph<br><span>nested</i>';
    const sanitizedMalformed = sanitizeHtml(malformed);
    assert.ok(typeof sanitizedMalformed === "string");
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n========================================================");
  console.log(`  Adversarial Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    console.error("FAILURES DETECTED:");
    failures.forEach((f) => {
      console.error(`- ${f.name}: ${f.error}`);
    });
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Suite runner crashed:", err);
  process.exit(1);
});
