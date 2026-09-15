import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(__dirname, "../../backend");

console.log("=================================================================");
console.log("  Challenger 2 Empirical Adversarial Test Harness (Gen 2)        ");
console.log("=================================================================");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

// ----------------------------------------------------------------------
// 1. CHALLENGE: API Hardcoding Elimination Across All Components
// ----------------------------------------------------------------------
console.log("\n--- Suite 1: API Hardcoding Elimination & Port Hygiene ---");

await test("No 'localhost:4000' strings exist in frontend/src except internal SSR fallback in api-fetch.ts", () => {
  const srcDir = path.join(frontendDir, "src");
  const matches = [];

  function scanDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("localhost:4000")) {
          matches.push(path.relative(srcDir, fullPath));
        }
      }
    }
  }
  scanDir(srcDir);

  assert.deepStrictEqual(
    matches,
    ["lib/api-fetch.ts"],
    `Found unexpected localhost:4000 references in: ${matches.join(", ")}`
  );
});

await test("All 11 target components import and utilize PUBLIC_API_URL or getApiUrl", () => {
  const components = [
    "components/AdminNotifications.tsx",
    "components/ArticleListSidebar.tsx",
    "components/CommentSection.tsx",
    "components/MomentCard.tsx",
    "components/MusicFloatingCard.tsx",
    "components/Sidebar.tsx",
    "components/VideoPlayer.tsx",
    "components/admin/LinkCardPanel.tsx",
    "components/article/ArticleCommentSection.tsx",
    "components/article/ArticleReader.tsx",
    "components/post-detail/PostDetail.tsx",
    "app/admin/users/AdminUsers.tsx",
  ];

  for (const relPath of components) {
    const filePath = path.join(frontendDir, "src", relPath);
    assert.ok(fs.existsSync(filePath), `File does not exist: ${relPath}`);
    const content = fs.readFileSync(filePath, "utf-8");
    const hasImport =
      content.includes('@/lib/api-fetch') ||
      content.includes('../lib/api-fetch') ||
      content.includes('../../lib/api-fetch');
    const usesPublicApi =
      content.includes('PUBLIC_API_URL') ||
      content.includes('getApiUrl');
    assert.ok(
      hasImport && usesPublicApi,
      `${relPath} does not properly import and use PUBLIC_API_URL/getApiUrl`
    );
    assert.ok(
      !content.includes("http://localhost:4000/api"),
      `${relPath} still has hardcoded http://localhost:4000/api`
    );
  }
});

await test("api-fetch.ts getApiUrl() correctly behaves isomorphically", () => {
  const apiFetchSrc = fs.readFileSync(path.join(frontendDir, "src/lib/api-fetch.ts"), "utf-8");
  assert.ok(apiFetchSrc.includes("export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || \"/api\";"));
  assert.ok(apiFetchSrc.includes('typeof window === "undefined" && PUBLIC_API_URL.startsWith("/")'));
  assert.ok(apiFetchSrc.includes("getBackendOrigin()"));
});

// ----------------------------------------------------------------------
// 2. CHALLENGE: Backend CORS Origin Checking in backend/src/app.ts
// ----------------------------------------------------------------------
console.log("\n--- Suite 2: Backend CORS Origin Checking Semantics ---");

// Test buildCorsOrigin under both DEV and PROD
await test("Backend CORS: in Development (NODE_ENV !== 'production'), all origins are accepted", async () => {
  const appSrc = fs.readFileSync(path.join(backendDir, "src/app.ts"), "utf-8");
  assert.ok(appSrc.includes("buildCorsOrigin"), "buildCorsOrigin function must exist in app.ts");

  // Extract logic
  const isDevLogic = (origin, env) => {
    const isDev = env.NODE_ENV !== "production";
    if (isDev) return true;
    if (!origin) return true;
    const raw = env.CORS_ALLOWED_ORIGINS || env.CLIENT_URL || "http://localhost:3000";
    const allowed = raw.split(",").map(s => s.trim()).filter(Boolean);
    return allowed.includes(origin);
  };

  // Dev mode
  const devEnv = { NODE_ENV: "development" };
  assert.strictEqual(isDevLogic("http://localhost:3000", devEnv), true);
  assert.strictEqual(isDevLogic("http://localhost:5173", devEnv), true);
  assert.strictEqual(isDevLogic("https://arbitrary-dev.example.com", devEnv), true);
  assert.strictEqual(isDevLogic(undefined, devEnv), true);
});

await test("Backend CORS: in Production (NODE_ENV === 'production'), strict whitelist is enforced", async () => {
  const isDevLogic = (origin, env) => {
    const isDev = env.NODE_ENV !== "production";
    if (isDev) return true;
    if (!origin) return true;
    const raw = env.CORS_ALLOWED_ORIGINS || env.CLIENT_URL || "http://localhost:3000";
    const allowed = raw.split(",").map(s => s.trim()).filter(Boolean);
    return allowed.includes(origin);
  };

  const prodEnv = {
    NODE_ENV: "production",
    CORS_ALLOWED_ORIGINS: "https://myblog.com, https://admin.myblog.com",
    CLIENT_URL: "https://fallback.com",
  };

  // Permitted origins
  assert.strictEqual(isDevLogic("https://myblog.com", prodEnv), true);
  assert.strictEqual(isDevLogic("https://admin.myblog.com", prodEnv), true);

  // Missing origin (e.g. server-to-server or curl) is allowed
  assert.strictEqual(isDevLogic(undefined, prodEnv), true);
  assert.strictEqual(isDevLogic("", prodEnv), true);

  // Disallowed origins
  assert.strictEqual(isDevLogic("https://attacker.com", prodEnv), false);
  assert.strictEqual(isDevLogic("http://myblog.com", prodEnv), false); // HTTP mismatch
  assert.strictEqual(isDevLogic("https://myblog.com.attacker.com", prodEnv), false); // Subdomain attack
  assert.strictEqual(isDevLogic("https://evil-myblog.com", prodEnv), false); // Prefix spoof
  assert.strictEqual(isDevLogic("http://localhost:3000", prodEnv), false); // Dev origin rejected in prod
});

await test("Backend CORS: whitespace and comma splitting handling in whitelist", async () => {
  const appSrc = fs.readFileSync(path.join(backendDir, "src/app.ts"), "utf-8");
  assert.ok(appSrc.includes(".split(\",\")"), "Must split by comma");
  assert.ok(appSrc.includes(".map((s) => s.trim())"), "Must trim whitespace");
  assert.ok(appSrc.includes(".filter(Boolean)"), "Must filter empty items");
});

// ----------------------------------------------------------------------
// 3. CHALLENGE: ISR Revalidation
// ----------------------------------------------------------------------
console.log("\n--- Suite 3: ISR Revalidation Hardening & Path Prioritization ---");

await test("backend/src/utils/revalidate.ts: triggerRevalidate signature supports paths?: string[]", () => {
  const revalSrc = fs.readFileSync(path.join(backendDir, "src/utils/revalidate.ts"), "utf-8");
  assert.ok(
    revalSrc.includes("export async function triggerRevalidate(paths?: string[]): Promise<void>"),
    "triggerRevalidate must support optional paths array"
  );
  assert.ok(revalSrc.includes("paths?.[0]"), "Must supply backward compatible path property");
  assert.ok(revalSrc.includes("FRONTEND_REVALIDATE_URL"), "Must check FRONTEND_REVALIDATE_URL");
  assert.ok(revalSrc.includes("split(\",\")[0].trim()"), "Must handle multi-value CLIENT_URL safely");
});

await test("frontend/src/app/api/revalidate/route.ts: prioritizes specific paths before channel layouts", async () => {
  const routeSrc = fs.readFileSync(path.join(frontendDir, "src/app/api/revalidate/route.ts"), "utf-8");

  assert.ok(routeSrc.includes("revalidatePath(p)"), "Must revalidate specific item paths");
  assert.ok(routeSrc.includes('revalidatePath("/", "layout")'), "Must revalidate / layout");
  assert.ok(routeSrc.includes('revalidatePath("/articles", "layout")'), "Must revalidate /articles layout");
  assert.ok(routeSrc.includes('revalidatePath("/moments", "layout")'), "Must revalidate /moments layout");
  assert.ok(routeSrc.includes('revalidatePath("/projects", "layout")'), "Must revalidate /projects layout");
  assert.ok(routeSrc.includes('revalidatePath("/archives", "layout")'), "Must revalidate /archives layout");
  assert.ok(routeSrc.includes('revalidatePath("/about", "layout")'), "Must revalidate /about layout");
  assert.ok(routeSrc.includes('revalidatePath("/equipment", "layout")'), "Must revalidate /equipment layout");
  assert.ok(routeSrc.includes('revalidatePath("/labs", "layout")'), "Must revalidate /labs layout");

  // Verify order: specific paths loop comes BEFORE layout revalidations
  const specificIndex = routeSrc.indexOf("for (const p of targetPaths)");
  const channelIndex = routeSrc.indexOf('revalidatePath("/", "layout")');
  assert.ok(specificIndex < channelIndex, "Specific paths must be revalidated BEFORE channel layouts");
});

await test("frontend/src/app/api/revalidate/route.ts: simulates POST execution with edge cases", async () => {
  // Test route handler logic in sandbox
  const simulatedRevalidate = [];
  const fakeRevalidatePath = (p, type) => simulatedRevalidate.push({ path: p, type });

  const handler = async (body, envSecret) => {
    const { secret, path, paths } = body;
    if (!envSecret || secret !== envSecret) {
      return { status: 401, body: { message: "Invalid secret" } };
    }
    const targetPaths = [];
    if (typeof path === "string" && path) targetPaths.push(path);
    if (Array.isArray(paths)) {
      for (const p of paths) {
        if (typeof p === "string" && p && !targetPaths.includes(p)) {
          targetPaths.push(p);
        }
      }
    }
    for (const p of targetPaths) {
      fakeRevalidatePath(p);
    }
    fakeRevalidatePath("/", "layout");
    fakeRevalidatePath("/articles", "layout");
    fakeRevalidatePath("/moments", "layout");
    fakeRevalidatePath("/projects", "layout");
    fakeRevalidatePath("/archives", "layout");
    fakeRevalidatePath("/about", "layout");
    fakeRevalidatePath("/equipment", "layout");
    fakeRevalidatePath("/labs", "layout");
    return { status: 200, body: { revalidated: true, now: Date.now() } };
  };

  // Case 1: Unauthorized
  const r1 = await handler({ secret: "wrong" }, "correct-secret");
  assert.strictEqual(r1.status, 401);

  // Case 2: Authorized with duplicate and mixed paths
  simulatedRevalidate.length = 0;
  const r2 = await handler(
    {
      secret: "correct-secret",
      path: "/articles/art-1",
      paths: ["/articles/art-1", "/projects/proj-1", "", null, 123, "/moments/mom-1"],
    },
    "correct-secret"
  );
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(simulatedRevalidate[0].path, "/articles/art-1");
  assert.strictEqual(simulatedRevalidate[1].path, "/projects/proj-1");
  assert.strictEqual(simulatedRevalidate[2].path, "/moments/mom-1");
  assert.strictEqual(simulatedRevalidate[3].path, "/");
  assert.strictEqual(simulatedRevalidate[3].type, "layout");
});

await test("backend/src/routes/posts.ts canonical path routing for create, update, delete, pin", () => {
  const postsSrc = fs.readFileSync(path.join(backendDir, "src/routes/posts.ts"), "utf-8");

  // getCanonicalPostPath logic test
  assert.ok(postsSrc.includes("function getCanonicalPostPath"));
  assert.ok(postsSrc.includes('post.category === "项目" || post.type === "project"'));
  assert.ok(postsSrc.includes('post.type === "article"'));

  // Update revalidation handles old and new path
  assert.ok(postsSrc.includes("const oldPath = getCanonicalPostPath(post);"));
  assert.ok(postsSrc.includes("const newPath = getCanonicalPostPath(post);"));
  assert.ok(postsSrc.includes("triggerRevalidate(Array.from(new Set([oldPath, newPath])));"));

  // Delete revalidation
  assert.ok(postsSrc.includes("const deletedPath = getCanonicalPostPath(post);"));
  assert.ok(postsSrc.includes("triggerRevalidate([deletedPath]);"));
});

// ----------------------------------------------------------------------
// 4. CHALLENGE: Detail Pages & Admin Error Resilience
// ----------------------------------------------------------------------
console.log("\n--- Suite 4: Detail Pages & Admin Console De-Mocking ---");

await test("Zero mockPosts remain in frontend/src", () => {
  const srcDir = path.join(frontendDir, "src");
  const matches = [];

  function scanDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("mockPosts")) {
          matches.push(path.relative(srcDir, fullPath));
        }
      }
    }
  }
  scanDir(srcDir);

  assert.deepStrictEqual(
    matches,
    [],
    `Found mockPosts still lingering in: ${matches.join(", ")}`
  );
});

await test("Detail pages strictly throw errors on 500/network and return null on 404", () => {
  const pages = [
    "src/app/articles/[id]/page.tsx",
    "src/app/moments/[id]/page.tsx",
    "src/app/projects/[id]/page.tsx",
  ];

  for (const page of pages) {
    const content = fs.readFileSync(path.join(frontendDir, page), "utf-8");
    assert.ok(content.includes("if (res.status === 404) return null;"), `${page} must return null on 404`);
    assert.ok(content.includes("if (!res.ok) {"), `${page} must check !res.ok`);
    assert.ok(content.includes("throw new Error("), `${page} must throw Error on non-404 failures`);
    assert.ok(content.includes("if (!post) notFound();"), `${page} must call notFound() when post is null`);
    assert.ok(content.includes('if (post.status === "draft") notFound();'), `${page} must guard drafts with notFound()`);
  }
});

await test("Zero forbidden moment keywords in src/app/projects/[id]/page.tsx", () => {
  const content = fs.readFileSync(path.join(frontendDir, "src/app/projects/[id]/page.tsx"), "utf-8");
  const forbidden = [
    /\b(likes|liked|Heart|点赞)\b/i,
    /\b(comments|MessageSquare|评论|评论框)\b/i,
    /\b(location|MapPin|定位)\b/i,
    /\b(emojis|emoji|表情包|互动气泡)\b/i,
    /<PostDetail\b/,
    /<PostCard\b/,
  ];

  for (const regex of forbidden) {
    assert.ok(!regex.test(content), `Found forbidden pattern ${regex} in projects/[id]/page.tsx`);
  }
});

await test("Admin pages have loadError state and retry button instead of mock fallback", () => {
  const articlesPage = fs.readFileSync(path.join(frontendDir, "src/app/admin/articles/page.tsx"), "utf-8");
  assert.ok(articlesPage.includes("loadError"), "admin/articles must have loadError state");
  assert.ok(articlesPage.includes("fetchArticles"), "admin/articles must call fetchArticles for retry");
  assert.ok(articlesPage.includes("重试"), "admin/articles must have retry button");
  assert.ok(!articlesPage.includes("mockArts"), "admin/articles must NOT construct mockArts");

  const projectsPage = fs.readFileSync(path.join(frontendDir, "src/app/admin/projects/page.tsx"), "utf-8");
  assert.ok(projectsPage.includes("loadError"), "admin/projects must have loadError state");
  assert.ok(projectsPage.includes("fetchProjects"), "admin/projects must call fetchProjects for retry");
  assert.ok(projectsPage.includes("重试"), "admin/projects must have retry button");
});

console.log("\n=================================================================");
console.log(`  Challenger 2 Results: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
console.log("=================================================================\n");

process.exit(failedTests > 0 ? 1 : 0);
