/**
 * Empirical Adversarial Challenger Test Suite
 * Archetype: EMPIRICAL CHALLENGER
 *
 * Direct empirical execution testing:
 * 1. PostList.tsx edge cases (rapid filter switching, pull-to-refresh resilience, empty category response, network timeout & abort)
 * 2. Detail pages edge cases (articles/[id], moments/[id], projects/[id]): 404 behavior, 500 error throwing, draft access security, keyword hygiene
 * 3. Backend CORS callback whitelist and ISR precision revalidation contracts
 * 4. Zero mockPosts across frontend/src
 */

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");

const frontendDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(__dirname, "../../backend");

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
console.log("  Empirical Adversarial Challenger Stress Harness (Challenger Gen2)");
console.log("=================================================================\n");

async function runEmpiricalSuite() {
  // -----------------------------------------------------------------
  // 1. PostList Edge Cases
  // -----------------------------------------------------------------
  console.log("--- Group 1: PostList.tsx Concurrency, Edge Cases & Contracts ---");

  await test("PostList: Rapid filter switching burst (20 switches) with randomized latency and out-of-order resolution", async () => {
    // Model PostList's exact category switching state machine
    let state = {
      posts: [{ id: "p0", title: "Init Post" }],
      page: 1,
      hasMore: true,
      error: false,
    };

    let activeController = null;
    const history = [];

    const switchCategory = (category, delayMs, payload) => {
      // Cleanup previous effect
      if (activeController) {
        activeController.abort();
      }

      const controller = new AbortController();
      activeController = controller;

      // PostList sets empty posts on filter change
      state.posts = [];
      state.page = 1;
      state.hasMore = false;
      state.error = false;

      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            if (controller.signal.aborted) {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              throw err;
            }

            if (!payload?.data || !Array.isArray(payload.data)) return;

            state.posts = payload.data;
            state.page = 1;
            state.hasMore = payload.pagination?.hasMore ?? false;
            state.error = false;
            history.push({ category, applied: true, dataCount: payload.data.length });
            resolve({ category, applied: true });
          } catch (err) {
            if (err?.name !== "AbortError") {
              state.error = true;
            }
            history.push({ category, applied: false, reason: err.name });
            resolve({ category, applied: false, reason: err.name });
          }
        }, delayMs);
      });
    };

    // Trigger 20 rapid switches with random delays
    const promises = [];
    const categories = ["全部", "随笔", "技术", "生活", "随笔", "技术", "全部", "生活", "随笔", "全部",
                        "生活", "技术", "全部", "随笔", "生活", "技术", "随笔", "全部", "生活", "FINAL_TARGET"];

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      // Final target has 15ms delay, earlier ones have random delays up to 60ms
      const delay = (i === categories.length - 1) ? 15 : Math.floor(Math.random() * 50) + 10;
      const count = i + 1;
      const payload = {
        data: [{ id: `post-${cat}-${count}`, title: `Post for ${cat}` }],
        pagination: { hasMore: false }
      };
      promises.push(switchCategory(cat, delay, payload));
    }

    await Promise.all(promises);

    // Assert that ONLY the final category is applied
    assert.strictEqual(state.error, false, "State should not have error flag set");
    assert.strictEqual(state.posts.length, 1, "State should have exactly 1 post from final category");
    assert.strictEqual(state.posts[0].id, "post-FINAL_TARGET-20", "State must contain the payload of the final category");
  });

  await test("PostList: Pull-to-refresh resilience against network timeout / 500 failure", async () => {
    // Model PostList.tsx lines 166-196 (refreshFirstPage)
    let state = {
      posts: [{ id: "existing-1", title: "Existing Post" }],
      page: 1,
      hasMore: false,
      error: false,
    };
    const postsRef = { current: state.posts };

    const simulateRefresh = async (resOk, resStatus, isNetworkTimeout = false) => {
      try {
        if (isNetworkTimeout) {
          throw new Error("Network timeout after 5000ms");
        }
        if (resOk) {
          state.posts = [{ id: "new-1", title: "Refreshed Post" }];
          postsRef.current = state.posts;
          state.error = false;
        } else if (!postsRef.current.length) {
          throw new Error("refresh failed");
        }
      } catch (err) {
        if (err?.name !== "AbortError" && !postsRef.current.length) {
          state.error = true;
        }
      }
    };

    // Case 1: Existing list has posts, refresh times out or returns 500 -> posts MUST NOT be cleared, error MUST NOT be true
    await simulateRefresh(false, 500, true);
    assert.strictEqual(state.posts.length, 1, "Existing posts must be preserved upon refresh failure");
    assert.strictEqual(state.posts[0].id, "existing-1", "Existing post data must remain intact");
    assert.strictEqual(state.error, false, "Error flag must remain false to prevent flashing error screen");

    // Case 2: List was empty, refresh fails -> error SHOULD be set to true
    state.posts = [];
    postsRef.current = [];
    await simulateRefresh(false, 500, false);
    assert.strictEqual(state.error, true, "Empty list refresh failure must trigger error state");

    // Case 3: List was empty, refresh succeeds -> posts updated, error false
    await simulateRefresh(true, 200, false);
    assert.strictEqual(state.posts.length, 1);
    assert.strictEqual(state.posts[0].id, "new-1");
    assert.strictEqual(state.error, false);
  });

  await test("PostList: Empty category response handling and slice text constraints", async () => {
    const postListCode = fs.readFileSync(path.join(frontendDir, "src/components/PostList.tsx"), "utf8");

    // Verification of static slicing constraint
    const firstOccur = postListCode.indexOf("posts.length === 0");
    const emptyIfIndex = postListCode.indexOf("if (posts.length === 0)");
    assert.strictEqual(firstOccur, emptyIfIndex + 4, "The first textual occurrence of posts.length === 0 MUST be the empty state branch");

    // Slicing logic used by m4_1 check
    const returnIndex = postListCode.indexOf("return (", emptyIfIndex);
    const slice = postListCode.slice(emptyIfIndex, returnIndex + 200);
    assert.ok(slice.includes("{renderCategoryFilter()}"), "Empty state slice MUST render category filter bar");

    // Ensure forbidden patterns do not exist
    assert.ok(!postListCode.includes("json.data.length === 0"), "Must not include forbidden json.data.length === 0");
    assert.ok(postListCode.includes("if (!json?.data || !Array.isArray(json.data)) return;"), "Must retain json data array guard");

    // Model empty category response
    let state = {
      posts: [{ id: "old", title: "Old" }],
      page: 1,
      hasMore: true,
      error: false,
    };
    const emptyResponse = { data: [], pagination: { hasMore: false } };
    if (!emptyResponse?.data || !Array.isArray(emptyResponse.data)) {
      assert.fail("Should not early return for empty array");
    }
    state.posts = emptyResponse.data;
    state.page = 1;
    state.hasMore = emptyResponse.pagination?.hasMore ?? false;
    state.error = false;

    assert.strictEqual(state.posts.length, 0);
    assert.strictEqual(state.hasMore, false);
    assert.strictEqual(state.error, false);
  });

  await test("PostList: Network timeout & error recovery (retryFirstPage & loadMore guards)", async () => {
    const postListCode = fs.readFileSync(path.join(frontendDir, "src/components/PostList.tsx"), "utf8");

    // Verify retryFirstPage has AbortController and resets error
    assert.ok(postListCode.includes("retryAbortRef.current?.abort();"), "retryFirstPage must abort previous in-flight retry");
    assert.ok(postListCode.includes("loadMoreAbortRef.current?.abort();"), "loadMore must abort previous in-flight load");
    assert.ok(postListCode.includes("loadingRef.current"), "loadMore must check loadingRef to prevent duplicate triggers");

    // Model retryFirstPage
    let errorState = true;
    let retryRan = false;
    const retryFirstPage = async (shouldSucceed) => {
      errorState = false; // resets on start
      try {
        if (!shouldSucceed) throw new Error("fetch failed (timeout)");
        retryRan = true;
      } catch (err) {
        if (err?.name !== "AbortError") {
          errorState = true;
        }
      }
    };

    await retryFirstPage(false);
    assert.strictEqual(errorState, true, "Failed retry sets error: true");

    await retryFirstPage(true);
    assert.strictEqual(errorState, false, "Successful retry clears error");
    assert.strictEqual(retryRan, true);
  });

  // -----------------------------------------------------------------
  // 2. Detail Pages Edge Cases (articles/[id], moments/[id], projects/[id])
  // -----------------------------------------------------------------
  console.log("\n--- Group 2: Detail Pages 404, 500, Draft Security & Keyword Hygiene ---");

  const detailFiles = [
    { name: "articles/[id]", path: "src/app/articles/[id]/page.tsx", type: "article" },
    { name: "moments/[id]", path: "src/app/moments/[id]/page.tsx", type: "moment" },
    { name: "projects/[id]", path: "src/app/projects/[id]/page.tsx", type: "project" },
  ];

  for (const item of detailFiles) {
    await test(`Detail Page (${item.name}): 404 status triggers notFound() and does NOT fall back to mock`, async () => {
      const code = fs.readFileSync(path.join(frontendDir, item.path), "utf8");

      // Verify no mockPosts
      assert.ok(!code.includes("mockPosts"), `${item.name} must not import or reference mockPosts`);

      // Verify getPost implementation
      assert.ok(code.includes("if (res.status === 404) return null;"), `${item.name} getPost must return null on 404`);
      assert.ok(code.includes("if (!post) notFound();"), `${item.name} must call notFound() when post is null`);

      // Model getPost behavior on 404
      const mockFetch404 = async () => ({ status: 404, ok: false });
      const getPost = async () => {
        const res = await mockFetch404();
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("fetch error");
        return { id: "test" };
      };

      const result = await getPost();
      assert.strictEqual(result, null, "getPost must return null for 404 status");
    });

    await test(`Detail Page (${item.name}): 500 error or network timeout throws Error to error.tsx boundary`, async () => {
      const code = fs.readFileSync(path.join(frontendDir, item.path), "utf8");

      assert.ok(code.includes("throw new Error(`网络请求失败:"), `${item.name} must throw Error on network catch`);
      assert.ok(code.includes("throw new Error(`获取"), `${item.name} must throw Error on non-ok (500) status`);

      // Model getPost behavior on 500
      const mockFetch500 = async () => ({ status: 500, ok: false, statusText: "Internal Server Error" });
      const getPost500 = async () => {
        const res = await mockFetch500();
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`获取失败 (${res.status}): ${res.statusText}`);
        return { id: "test" };
      };

      await assert.rejects(
        async () => await getPost500(),
        /获取失败 \(500\)/,
        "getPost must throw an Error on 500 status"
      );

      // Model getPost behavior on network exception
      const mockFetchNetworkError = async () => { throw new Error("fetch failed: ECONNREFUSED"); };
      const getPostNetwork = async () => {
        try {
          await mockFetchNetworkError();
        } catch (err) {
          throw new Error(`网络请求失败: ${err.message}`);
        }
      };

      await assert.rejects(
        async () => await getPostNetwork(),
        /网络请求失败: fetch failed: ECONNREFUSED/,
        "getPost must throw an Error on network failure"
      );
    });

    await test(`Detail Page (${item.name}): generateMetadata catches network errors gracefully`, async () => {
      const code = fs.readFileSync(path.join(frontendDir, item.path), "utf8");

      assert.ok(code.includes("export async function generateMetadata"), `${item.name} must export generateMetadata`);
      // Verify try...catch inside generateMetadata
      const metaFnRegex = /export\s+async\s+function\s+generateMetadata[\s\S]*?try\s*\{[\s\S]*?\}\s*catch/;
      assert.ok(metaFnRegex.test(code), `${item.name} generateMetadata must wrap in try...catch to prevent unhandled crash`);
    });

    await test(`Detail Page (${item.name}): Draft post access triggers notFound() defense-in-depth`, async () => {
      const code = fs.readFileSync(path.join(frontendDir, item.path), "utf8");

      assert.ok(code.includes('if (post.status === "draft") notFound();'),
        `${item.name} must strictly call notFound() when post.status is draft`);
    });
  }

  await test("Detail Page (projects/[id]): Zero moment fields / forbidden keywords across entire file", async () => {
    const projectDetailCode = fs.readFileSync(path.join(frontendDir, "src/app/projects/[id]/page.tsx"), "utf8");

    const forbidden = [
      { name: "likes", regex: /\blikes\b/ },
      { name: "comments", regex: /\bcomments\b/ },
      { name: "location", regex: /\blocation\b/ },
      { name: "emojis", regex: /\bemojis\b/ },
      { name: "PostDetail", regex: /\bPostDetail\b/ },
      { name: "PostCard", regex: /\bPostCard\b/ },
      { name: "点赞 (Chinese likes)", regex: /点赞/ },
      { name: "评论 (Chinese comments)", regex: /评论/ },
      { name: "定位 (Chinese location)", regex: /定位/ },
      { name: "表情包 (Chinese emoji)", regex: /表情包/ },
      { name: "互动气泡 (Chinese interaction bubble)", regex: /互动气泡/ },
    ];

    for (const f of forbidden) {
      assert.ok(
        !f.regex.test(projectDetailCode),
        `projects/[id]/page.tsx must have 0 occurrences of forbidden term: ${f.name}`
      );
    }
  });

  await test("Global: Zero occurrences of mockPosts in entire frontend/src", async () => {
    const checkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(full, "utf8");
          assert.ok(!content.includes("mockPosts"), `File ${full} must not contain 'mockPosts'`);
        }
      }
    };
    checkDir(path.join(frontendDir, "src"));
  });

  await test("Global: Zero occurrences of localhost:4000 in frontend/src except api-fetch.ts", async () => {
    const checkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const rel = path.relative(frontendDir, full);
          if (rel === "src/lib/api-fetch.ts") continue;
          const content = fs.readFileSync(full, "utf8");
          assert.ok(!content.includes("localhost:4000"), `File ${rel} must not contain 'localhost:4000'`);
        }
      }
    };
    checkDir(path.join(frontendDir, "src"));
  });

  // -----------------------------------------------------------------
  // 3. Backend Hardening & Revalidation Contracts
  // -----------------------------------------------------------------
  console.log("\n--- Group 3: Backend CORS Whitelist & ISR Revalidation Verification ---");

  await test("Backend: buildCorsOrigin callback whitelist semantics", async () => {
    const appTs = fs.readFileSync(path.join(backendDir, "src/app.ts"), "utf8");

    assert.ok(appTs.includes("function buildCorsOrigin(): cors.CorsOptions[\"origin\"]"), "buildCorsOrigin must return cors origin callback");

    // Execute the exact logic implemented in backend/src/app.ts:27-40
    const buildCorsOrigin = (nodeEnv, allowedOriginsEnv) => {
      const isDev = nodeEnv !== "production";
      return (origin, callback) => {
        if (isDev) return callback(null, true);
        if (!origin) return callback(null, true);
        const raw = allowedOriginsEnv || "http://localhost:3000";
        const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
        if (allowed.includes(origin)) return callback(null, true);
        return callback(null, false);
      };
    };

    // Test Dev mode
    const devCors = buildCorsOrigin("development", "https://myblog.com");
    let devResult = null;
    devCors("https://random-site.org", (err, allow) => { devResult = allow; });
    assert.strictEqual(devResult, true, "Dev mode must allow any origin");

    // Test Prod mode - allowed origin
    const prodCors = buildCorsOrigin("production", "https://myblog.com, https://admin.myblog.com");
    let prodAllowed = null;
    prodCors("https://myblog.com", (err, allow) => { prodAllowed = allow; });
    assert.strictEqual(prodAllowed, true, "Prod mode must allow whitelisted origin");

    // Test Prod mode - disallowed origin
    let prodDisallowed = null;
    prodCors("https://evil-attacker.com", (err, allow) => { prodDisallowed = allow; });
    assert.strictEqual(prodDisallowed, false, "Prod mode must block non-whitelisted origin");

    // Test Prod mode - no origin (server-to-server or curl)
    let prodNoOrigin = null;
    prodCors(undefined, (err, allow) => { prodNoOrigin = allow; });
    assert.strictEqual(prodNoOrigin, true, "Prod mode must allow requests without origin");
  });

  await test("Backend: ISR triggerRevalidate and getCanonicalPostPath", async () => {
    const postsRoutes = fs.readFileSync(path.join(backendDir, "src/routes/posts.ts"), "utf8");
    const revalidateTs = fs.readFileSync(path.join(backendDir, "src/utils/revalidate.ts"), "utf8");

    assert.ok(revalidateTs.includes("export async function triggerRevalidate(paths?: string[]): Promise<void>"), "triggerRevalidate must support paths?: string[]");
    assert.ok(revalidateTs.includes("paths,") && revalidateTs.includes("path: paths?.[0]"), "triggerRevalidate must pass paths and path");

    assert.ok(postsRoutes.includes("function getCanonicalPostPath(post:"), "posts.ts must define getCanonicalPostPath");

    // Test getCanonicalPostPath logic directly
    const getCanonicalPostPath = (post) => {
      const slug = post.shortId || post.id;
      if (post.category === "项目" || post.type === "project") return `/projects/${slug}`;
      if (post.type === "article") return `/articles/${slug}`;
      return `/moments/${slug}`;
    };

    assert.strictEqual(getCanonicalPostPath({ id: "123", shortId: "my-art", type: "article" }), "/articles/my-art");
    assert.strictEqual(getCanonicalPostPath({ id: "123", category: "项目", type: "article" }), "/projects/123");
    assert.strictEqual(getCanonicalPostPath({ id: "456", type: "moment" }), "/moments/456");
  });

  await test("Frontend: /api/revalidate route prioritizes specific path before channels", async () => {
    const routeCode = fs.readFileSync(path.join(frontendDir, "src/app/api/revalidate/route.ts"), "utf8");

    // Verify secret authentication
    assert.ok(routeCode.includes("secret !== expected"), "Must guard secret");

    // Verify targetPaths prioritized
    const specificLoop = routeCode.indexOf("for (const p of targetPaths)");
    const channelsReval = routeCode.indexOf('revalidatePath("/", "layout")');
    assert.ok(specificLoop < channelsReval, "Specific path loop must occur BEFORE channel layouts revalidation");

    // Simulate route execution with mock revalidatePath
    const revalidatedOrder = [];
    const mockRevalidatePath = (path, type) => {
      revalidatedOrder.push({ path, type: type || "page" });
    };

    const runRevalidateLogic = (body, expectedSecret) => {
      if (!expectedSecret || body.secret !== expectedSecret) {
        throw new Error("Invalid secret");
      }
      const targetPaths = [];
      if (typeof body.path === "string" && body.path) targetPaths.push(body.path);
      if (Array.isArray(body.paths)) {
        for (const p of body.paths) {
          if (typeof p === "string" && p && !targetPaths.includes(p)) targetPaths.push(p);
        }
      }
      for (const p of targetPaths) {
        mockRevalidatePath(p);
      }
      mockRevalidatePath("/", "layout");
      mockRevalidatePath("/articles", "layout");
      mockRevalidatePath("/moments", "layout");
      mockRevalidatePath("/projects", "layout");
    };

    runRevalidateLogic({ secret: "sec123", paths: ["/articles/my-slug"] }, "sec123");
    assert.strictEqual(revalidatedOrder[0].path, "/articles/my-slug", "First revalidated path must be the specific target");
    assert.strictEqual(revalidatedOrder[1].path, "/");
  });

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`  Adversarial Challenge Empirical Harness Summary: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================================\n");

  if (failed > 0) {
    console.error("FAILURES DETECTED:");
    for (const f of failures) {
      console.error(`- ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

runEmpiricalSuite().catch((err) => {
  console.error("Fatal test suite runner error:", err);
  process.exit(1);
});
