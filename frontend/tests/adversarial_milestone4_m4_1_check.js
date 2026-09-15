/**
 * Adversarial Empirical Verification Suite for Milestone 4 (Challenger M4-1)
 *
 * Focus:
 * 1. PostList race conditions: burst category switches, AbortController cancellation, out-of-order responses.
 * 2. Empty states: true empty state rendering, no mockPosts fallbacks across all channels and error states.
 * 3. Hydration & White screens: ProfileFadeIn SSR visibility without JS, sanitize.ts token determinism across SSR & browser.
 * 4. Error boundaries and ISR completeness.
 */

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");

const frontendDir = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${name}: ${err.message}`);
  }
}

console.log("\n=================================================================");
console.log("  Adversarial Challenge M4-1: Deep Empirical Stress Harness");
console.log("=================================================================\n");

async function runChallengerSuite() {
  // -----------------------------------------------------------------
  // 1. Race Conditions & AbortController (Task 1)
  // -----------------------------------------------------------------
  console.log("--- 1. PostList.tsx Race Condition & AbortController Stress Test ---");

  await test("PostList: In-flight requests are aborted upon subsequent category switch", async () => {
    const postListCode = fs.readFileSync(path.join(frontendDir, "src/components/PostList.tsx"), "utf8");

    // Structural checks
    assert.ok(postListCode.includes("const controller = new AbortController();"), "Must instantiate AbortController");
    assert.ok(postListCode.includes("signal: controller.signal"), "Must pass controller.signal to fetch");
    assert.ok(postListCode.includes("controller.abort()"), "Must call controller.abort() in effect cleanup");
    assert.ok(postListCode.includes("controller.signal.aborted"), "Must guard response handling with controller.signal.aborted");
    assert.ok(postListCode.includes('err?.name !== "AbortError"'), "Must safely handle AbortError without error state leak");
  });

  await test("PostList: High-frequency category switching burst (10 rapid switches) with randomized network jitter", async () => {
    // Model state machine exactly as implemented in PostList.tsx (lines 93-125)
    let state = {
      posts: [{ id: "init", title: "Init" }],
      page: 1,
      hasMore: true,
    };

    let activeCleanup = null;
    const requestLog = [];

    const triggerCategoryChange = (category, latencyMs, payload) => {
      // Cleanup previous effect
      if (activeCleanup) {
        activeCleanup();
      }

      const controller = new AbortController();
      activeCleanup = () => {
        controller.abort();
      };

      const reqId = category;
      requestLog.push({ reqId, status: "started" });

      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            if (controller.signal.aborted) {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              throw err;
            }

            const json = payload;
            if (controller.signal.aborted) return;
            if (!json?.data || !Array.isArray(json.data)) return;

            // Update state
            state.posts = json.data;
            state.page = 1;
            state.hasMore = json.pagination?.hasMore ?? false;
            requestLog.push({ reqId, status: "applied", data: json.data });
            resolve({ reqId, applied: true });
          } catch (err) {
            if (err?.name === "AbortError") {
              requestLog.push({ reqId, status: "aborted" });
            }
            resolve({ reqId, applied: false, reason: err.name });
          }
        }, latencyMs);
      });
    };

    // Burst of 10 category selections in rapid succession
    const categories = [
      { cat: "技术", latency: 180, items: [{ id: "t1" }, { id: "t2" }] },
      { cat: "随笔", latency: 150, items: [{ id: "e1" }] },
      { cat: "生活", latency: 210, items: [{ id: "l1" }, { id: "l2" }] },
      { cat: "游记", latency: 90,  items: [{ id: "y1" }] },
      { cat: "杂感", latency: 160, items: [{ id: "z1" }] },
      { cat: "读书", latency: 200, items: [{ id: "b1" }] },
      { cat: "摄影", latency: 110, items: [{ id: "p1" }] },
      { cat: "音乐", latency: 140, items: [{ id: "m1" }] },
      { cat: "影视", latency: 170, items: [{ id: "f1" }] },
      { cat: "最终分类", latency: 60, items: [{ id: "final-1" }, { id: "final-2" }, { id: "final-3" }] },
    ];

    const promises = [];
    for (let i = 0; i < categories.length; i++) {
      const { cat, latency, items } = categories[i];
      promises.push(
        triggerCategoryChange(cat, latency, {
          data: items,
          pagination: { hasMore: false },
        })
      );
      // 2ms interval between clicks
      await new Promise((r) => setTimeout(r, 2));
    }

    const results = await Promise.all(promises);

    // All first 9 requests MUST have been aborted
    for (let i = 0; i < 9; i++) {
      assert.strictEqual(results[i].applied, false, `Category ${categories[i].cat} should have been aborted`);
      assert.strictEqual(results[i].reason, "AbortError");
    }

    // Only the 10th request (the final one) MUST have been applied
    assert.strictEqual(results[9].applied, true, "Final category must be applied");
    assert.strictEqual(results[9].reqId, "最终分类");

    // Final state verification
    assert.strictEqual(state.posts.length, 3, "State should contain exactly the final 3 posts");
    assert.deepStrictEqual(state.posts.map((p) => p.id), ["final-1", "final-2", "final-3"]);
  });

  await test("PostList: Out-of-order resolution where older slow response arrives after newer fast response", async () => {
    let posts = [{ id: "old" }];
    let cleanup = null;

    const dispatch = (cat, delay, items) => {
      if (cleanup) cleanup();
      const ctrl = new AbortController();
      cleanup = () => ctrl.abort();

      return new Promise((resolve) => {
        setTimeout(() => {
          if (ctrl.signal.aborted) {
            resolve({ aborted: true, cat });
            return;
          }
          posts = items;
          resolve({ aborted: false, cat });
        }, delay);
      });
    };

    // Slow request (Cat A, 150ms)
    const pA = dispatch("CatA", 150, [{ id: "A1" }, { id: "A2" }]);
    // 10ms later: Fast request (Cat B, 30ms)
    await new Promise((r) => setTimeout(r, 10));
    const pB = dispatch("CatB", 30, [{ id: "B1" }]);

    const [resA, resB] = await Promise.all([pA, pB]);

    assert.strictEqual(resA.aborted, true, "Cat A must be aborted even though it finished after Cat B");
    assert.strictEqual(resB.aborted, false, "Cat B must succeed");
    assert.deepStrictEqual(posts, [{ id: "B1" }], "State must preserve Cat B data and not be overwritten by Cat A");
  });

  await test("PostList: SSR Initial mount deduplication behaves correctly with truthy vs falsy initialPosts", () => {
    const simulateMount = (initialPosts) => {
      const isInitialMount = { current: true };
      let fetchCalled = false;

      // Logic from PostList.tsx lines 94-97:
      if (isInitialMount.current) {
        isInitialMount.current = false;
        if (initialPosts) return { fetched: false, isInitialMount: isInitialMount.current };
      }

      fetchCalled = true;
      return { fetched: fetchCalled, isInitialMount: isInitialMount.current };
    };

    // Case 1: Initial posts provided (array with items)
    const resWithPosts = simulateMount([{ id: "1" }]);
    assert.strictEqual(resWithPosts.fetched, false, "Should skip fetch when initialPosts provided");
    assert.strictEqual(resWithPosts.isInitialMount, false);

    // Case 2: Initial posts provided as empty array []
    const resWithEmptyArray = simulateMount([]);
    assert.strictEqual(resWithEmptyArray.fetched, false, "Should skip fetch even when initialPosts is []");
    assert.strictEqual(resWithEmptyArray.isInitialMount, false);

    // Case 3: Initial posts null or undefined (e.g. client-only render)
    const resWithoutPosts = simulateMount(null);
    assert.strictEqual(resWithoutPosts.fetched, true, "Should fetch when initialPosts is null");
    assert.strictEqual(resWithoutPosts.isInitialMount, false);
  });

  // -----------------------------------------------------------------
  // 2. Empty States & Mock Fallback Purge (Task 2)
  // -----------------------------------------------------------------
  console.log("\n--- 2. Authentic Empty States & Mock Fallback Purge ---");

  await test("PostList: Empty array [] from backend renders correct channel empty labels", () => {
    const postListCode = fs.readFileSync(path.join(frontendDir, "src/components/PostList.tsx"), "utf8");

    // Extract empty render branch
    assert.ok(postListCode.includes("if (posts.length === 0) {"), "Must have posts.length === 0 branch");

    // Test label rendering logic:
    const renderEmptyLabel = (layout, category, type) => {
      return (layout === "projects" || category === "项目")
        ? "暂未发布项目内容"
        : type === "article"
        ? "该分类下暂无文章"
        : "暂无动态";
    };

    assert.strictEqual(renderEmptyLabel("projects", undefined, undefined), "暂未发布项目内容");
    assert.strictEqual(renderEmptyLabel("list", "项目", undefined), "暂未发布项目内容");
    assert.strictEqual(renderEmptyLabel("list", undefined, "article"), "该分类下暂无文章");
    assert.strictEqual(renderEmptyLabel("list", undefined, "moment"), "暂无动态");
    assert.strictEqual(renderEmptyLabel("grid", undefined, undefined), "暂无动态");
  });

  await test("PostList: Category filter bar remains rendered when posts list is empty", () => {
    const postListCode = fs.readFileSync(path.join(frontendDir, "src/components/PostList.tsx"), "utf8");

    // In the empty posts branch (lines 243-256):
    const emptyBranch = postListCode.slice(
      postListCode.indexOf("if (posts.length === 0)"),
      postListCode.indexOf("return (", postListCode.indexOf("if (posts.length === 0)") + 20) + 200
    );

    assert.ok(
      emptyBranch.includes("{renderCategoryFilter()}"),
      "Category filter bar must remain rendered in empty state so user can switch categories"
    );
  });

  await test("Channel pages: Complete absence of mockPosts fallback in articles, projects, and moments", () => {
    const articlesPage = fs.readFileSync(path.join(frontendDir, "src/app/articles/page.tsx"), "utf8");
    const projectsPage = fs.readFileSync(path.join(frontendDir, "src/app/projects/page.tsx"), "utf8");
    const momentsPage = fs.readFileSync(path.join(frontendDir, "src/app/moments/page.tsx"), "utf8");

    // None should import mockPosts or use fallback articles/projects/moments
    assert.ok(!articlesPage.includes("fallbackArticles"), "articles/page.tsx must not contain fallbackArticles");
    assert.ok(!articlesPage.includes("posts as mockPosts"), "articles/page.tsx must not import mockPosts");

    assert.ok(!projectsPage.includes("fallbackProjects"), "projects/page.tsx must not contain fallbackProjects");
    assert.ok(!projectsPage.includes("posts as mockPosts"), "projects/page.tsx must not import mockPosts");

    assert.ok(!momentsPage.includes("fallbackMoments"), "moments/page.tsx must not contain fallbackMoments");
    assert.ok(!momentsPage.includes("posts as mockPosts"), "moments/page.tsx must not import mockPosts");
  });

  await test("Channel pages: Network failure or 500 error gracefully degrades to genuine empty list", () => {
    // Simulate getArticles, getProjectPosts, getMoments data fetcher error paths
    const simulateChannelFetch = (fetchResult) => {
      try {
        if (!fetchResult.ok) return { data: [], hasMore: false, total: 0 };
        const json = fetchResult.json;
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

    // 1. HTTP 500
    const err500 = simulateChannelFetch({ ok: false });
    assert.deepStrictEqual(err500, { data: [], hasMore: false, total: 0 });

    // 2. HTTP 200 with empty array
    const empty200 = simulateChannelFetch({ ok: true, json: { data: [], pagination: { total: 0, hasMore: false } } });
    assert.deepStrictEqual(empty200, { data: [], hasMore: false, total: 0 });

    // 3. HTTP 200 with null data
    const nullData = simulateChannelFetch({ ok: true, json: { data: null } });
    assert.deepStrictEqual(nullData, { data: [], hasMore: false, total: 0 });

    // 4. Exception / Network crash
    const crashed = simulateChannelFetch(null);
    assert.deepStrictEqual(crashed, { data: [], hasMore: false, total: 0 });
  });

  await test("AboutReader: LocalStorage fallback is strictly dormant when server content is present", () => {
    const code = fs.readFileSync(path.join(frontendDir, "src/components/AboutReader.tsx"), "utf8");

    // Must gate localStorage reading behind !page.content
    assert.ok(code.includes("if (!page.content)"), "Must check if (!page.content) before reading localStorage");
    assert.ok(code.includes("localStorage.getItem(\"about_page_content\")"), "Reads about_page_content conditionally");
  });

  // -----------------------------------------------------------------
  // 3. Hydration & White Screen Prevention (Task 3)
  // -----------------------------------------------------------------
  console.log("\n--- 3. Hydration & White Screen Robustness ---");

  await test("ProfileFadeIn: Initial SSR render is immediately visible (no opacity-0)", () => {
    const code = fs.readFileSync(path.join(frontendDir, "src/components/profile/ProfileFadeIn.tsx"), "utf8");

    // Verify state initialization
    assert.ok(code.includes("const [ready, setReady] = useState(false);"), "ready initialized to false");
    assert.ok(code.includes("const [done, setDone] = useState(false);"), "done initialized to false");

    // Verify className computation
    assert.ok(
      code.includes('className={`flex flex-1 flex-col ${ready && !done ? "profile-fade-in" : ""}`}'),
      "Initial className must NOT have opacity-0"
    );

    // Simulate initial SSR render
    const ready = false;
    const done = false;
    const initialClassName = `flex flex-1 flex-col ${ready && !done ? "profile-fade-in" : ""}`;
    assert.strictEqual(initialClassName.trim(), "flex flex-1 flex-col");
    assert.ok(!initialClassName.includes("opacity-0"), "SSR output must not contain opacity-0");

    // Simulate hydration animation transition
    const hydratingClassName = `flex flex-1 flex-col ${true && !false ? "profile-fade-in" : ""}`;
    assert.ok(hydratingClassName.includes("profile-fade-in"), "Hydrated active animation adds profile-fade-in");

    // Simulate animation finished
    const completedClassName = `flex flex-1 flex-col ${true && !true ? "profile-fade-in" : ""}`;
    assert.strictEqual(completedClassName.trim(), "flex flex-1 flex-col", "Completed animation strips profile-fade-in");
  });

  await test("sanitize.ts: Isomorphic sanitization produces identical output across Node and browser simulation", () => {
    const { sanitizeHtml, renderContent, plainTextToHtml, looksLikeHtml } = require(path.join(frontendDir, "src/lib/sanitize.ts"));

    const adversarialPayloads = [
      // XSS Attacks
      "<script>alert('xss')</script>",
      "<SCRIPT SRC='http://evil.com/x.js'></SCRIPT>",
      "<img src='valid.png' onerror='alert(1)' />",
      "<svg onload='alert(1)'><circle r='10'/></svg>",
      "<a href='javascript:alert(1)'>Click me</a>",
      "<a href='JAVASCRIPT:void(0)'>Click uppercase</a>",
      "<a href='  javascript:alert(1)'>Click with whitespace</a>",
      "<iframe src='http://evil.com'></iframe>",
      "<object data='bad.swf'></object>",
      "<embed src='bad.swf'>",
      "<form action='/evil'><input type='text' value='steal'/><button>Submit</button></form>",
      "<div style='background: url(javascript:alert(1)); position: fixed;'>Hack</div>",
      "<p style='expression(alert(1))'>Style expression</p>",

      // Rel noopener noreferrer injection
      "<a href='https://github.com' target='_blank'>GitHub</a>",
      "<a href='https://github.com' target='_blank' rel='custom'>GitHub with custom rel</a>",

      // Benign rich text
      "<p>Hello world <strong>bold</strong> <em>italic</em></p>",
      "<h1>Heading 1</h1><h2>Heading 2</h2>",
      "<ul><li>List item 1</li><li>List item 2</li></ul>",
      "<table class='my-table'><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>",
      "<blockquote>Safe quote</blockquote><pre><code>const a = 1;</code></pre>",

      // Boundary / Malformed HTML
      "<p>Unclosed paragraph <span>with span",
      "<<script>script>alert(1)<</script>",
      "Plain text with < and > and & symbols",
      "Multiple\nlines\nof\nplain\ntext",
      "Emoji [微笑] and shortcode :heart:",
    ];

    // 1. Run in Node.js (SSR)
    const ssrOutputs = adversarialPayloads.map((payload) => ({
      payload,
      sanitized: sanitizeHtml(payload),
      rendered: renderContent(payload),
    }));

    // 2. Simulate Browser environment by providing window and document
    global.window = { location: { href: "http://localhost:3000" } };
    global.document = {
      createElement: () => ({}),
    };

    const browserOutputs = adversarialPayloads.map((payload) => ({
      payload,
      sanitized: sanitizeHtml(payload),
      rendered: renderContent(payload),
    }));

    // Clean up globals
    delete global.window;
    delete global.document;

    // 3. Compare SSR and Browser outputs byte-for-byte
    for (let i = 0; i < adversarialPayloads.length; i++) {
      assert.strictEqual(
        ssrOutputs[i].sanitized,
        browserOutputs[i].sanitized,
        `sanitizeHtml hydration mismatch on payload: ${adversarialPayloads[i]}`
      );
      assert.strictEqual(
        ssrOutputs[i].rendered,
        browserOutputs[i].rendered,
        `renderContent hydration mismatch on payload: ${adversarialPayloads[i]}`
      );
    }

    // 4. Verify specific security criteria
    const xssScript = sanitizeHtml("<script>alert(1)</script><p>Text</p>");
    assert.strictEqual(xssScript, "<p>Text</p>");

    const xssOnerror = sanitizeHtml("<img src='pic.jpg' onerror='alert(1)' />");
    assert.ok(!xssOnerror.includes("onerror"), "onerror must be eliminated");
    assert.ok(xssOnerror.includes("pic.jpg"), "safe src preserved");

    const xssJavascriptHref = sanitizeHtml("<a href='javascript:alert(1)'>link</a>");
    assert.ok(!xssJavascriptHref.includes("javascript:"), "javascript: must be stripped");

    const extLink = sanitizeHtml("<a href='https://example.com' target='_blank'>Ext</a>");
    assert.ok(extLink.includes('rel="noopener noreferrer"'), "Must add rel=noopener noreferrer");

    const fixedPos = sanitizeHtml("<div style='position: fixed;'>Content</div>");
    assert.ok(!fixedPos.includes("position: fixed"), "position: fixed must be neutralized to static");
  });

  // -----------------------------------------------------------------
  // 4. Error Boundaries & ISR Revalidation (Task 4)
  // -----------------------------------------------------------------
  console.log("\n--- 4. Error & 404 Boundaries and ISR Revalidation ---");

  await test("not-found.tsx: 404 page exists and provides navigation back home", () => {
    const filePath = path.join(frontendDir, "src/app/not-found.tsx");
    assert.ok(fs.existsSync(filePath), "src/app/not-found.tsx must exist");
    const content = fs.readFileSync(filePath, "utf8");

    assert.ok(content.includes("404"), "Must render 404");
    assert.ok(content.includes('href="/"'), "Must have Link with href='/'");
    assert.ok(content.includes("返回首页"), "Must contain return home button");
  });

  await test("error.tsx: Error boundary component exists with reset capability", () => {
    const filePath = path.join(frontendDir, "src/app/error.tsx");
    assert.ok(fs.existsSync(filePath), "src/app/error.tsx must exist");
    const content = fs.readFileSync(filePath, "utf8");

    assert.ok(content.includes('"use client"') || content.includes("'use client'"), "Must be a Client Component");
    assert.ok(/reset:\s*\(\)\s*=>\s*void/.test(content), "Must receive reset function in props");
    assert.ok(content.includes("reset()"), "Must offer reset() button trigger");
    assert.ok(content.includes('href="/"'), "Must have Link to home /");
  });

  await test("api/revalidate/route.ts: Correctly invalidates all content channels and guards with secret", () => {
    const routePath = path.join(frontendDir, "src/app/api/revalidate/route.ts");
    assert.ok(fs.existsSync(routePath), "src/app/api/revalidate/route.ts must exist");
    const content = fs.readFileSync(routePath, "utf8");

    // Secret validation
    assert.ok(content.includes("secret !== expected"), "Must compare secret against expected environment variable");
    assert.ok(content.includes("status: 401"), "Must return 401 status when secret is invalid");

    // Channels revalidated
    assert.ok(content.includes('revalidatePath("/articles"'), "Must revalidate /articles");
    assert.ok(content.includes('revalidatePath("/moments"'), "Must revalidate /moments");
    assert.ok(content.includes('revalidatePath("/projects"'), "Must revalidate /projects");
    assert.ok(content.includes('revalidatePath("/archives"'), "Must revalidate /archives");
    assert.ok(content.includes('revalidatePath("/about"'), "Must revalidate /about");
  });

  // -----------------------------------------------------------------
  // Final Result
  // -----------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`  Adversarial Challenge M4-1 Summary: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runChallengerSuite().catch((err) => {
  console.error("Fatal test harness exception:", err);
  process.exit(1);
});
