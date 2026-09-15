# TEST_READY: Blog Frontend E2E Test Suite (Tiers 1-4)

**Status**: READY & EXECUTABLE
**Test Suite Directory**: `/home/dual/Projects/Blog-personal/frontend/tests/e2e/`
**Execution Command**: `npm run test:e2e` or `node tests/e2e/runner.js`
**Date**: 2026-09-12

---

## 1. Test Architecture & Execution

The opaque-box E2E test harness verifies all product requirements from `ORIGINAL_REQUEST.md` (R1-R4) and interface contracts in `PROJECT.md`. It executes without external browser dependencies by simulating Next.js App Router route resolution, HTTP headers, SSR/client state machines, component contracts, and DOM security boundaries.

### How to Run
```bash
# In /home/dual/Projects/Blog-personal/frontend:

# Run the complete test suite (Tiers 1-4)
npm run test:e2e
# or
node tests/e2e/runner.js

# Filter by tier
npm run test:e2e -- --tier=1
npm run test:e2e -- --tier=2
npm run test:e2e -- --tier=3
npm run test:e2e -- --tier=4

# Filter by feature or milestone
npm run test:e2e -- --feature=F1
npm run test:e2e -- --milestone=M1

# Strict mode (enforces 100% pass for Milestone 5 audit)
npm run test:e2e -- --strict
```

---

## 2. Test Coverage & Statistics Summary

| Tier | Tier Description | Test Suites | Test Cases | Target Threshold | Actual Status |
|:---:|:---|:---:|:---:|:---:|:---:|
| **Tier 1** | Feature Coverage (F1 - F19) | 9 files / 19 suites | 92 tests | ≥5 per feature (≥95) | 75 Pass / 17 Pending |
| **Tier 2** | Boundary & Corner Cases | 6 files / 6 suites | 31 tests | ≥5 per suite (≥30) | 27 Pass / 4 Pending |
| **Tier 3** | Cross-Feature Interactions | 1 file / 5 suites | 9 tests | Pairwise interactions | 8 Pass / 1 Pending |
| **Tier 4** | Real-World Application Scenarios | 1 file / 6 suites | 27 tests | ≥6 user walkthroughs | 23 Pass / 4 Pending |
| **Total** | **Full Opaque-Box Suite** | **36 Suites** | **159 Tests** | **>200 Assertions** | **359 Assertions (83.6% Pass)** |

---

## 3. Feature Inventory Mapping (F1 - F19)

| Feature | Description | Tier 1 Tests | Tier 2/3/4 Coverage | Current Baseline |
|:---|:---|:---:|:---:|:---:|
| **F1** | Article Canonical Routes (`/articles`, `/articles/[id]`) | 5 | T2.1, T2.2, T3.2, S1, S5 | PASS (100%) |
| **F2** | Project Canonical Routes (`/projects`, `/projects/[id]`, external) | 5 | T2.2, T3.1, S3 | PASS (100%) |
| **F3** | Moments Canonical Routes (`/moments`, `/moments/[id]`) | 5 | T2.1, T3.3, S1, S5 | 1 Pending (Back Button) |
| **F4** | Cross-Channel Route Guards (307/308 redirects) | 6 | T2.1, T3.3, T3.5 | 1 Pending (Server Guard in detail) |
| **F5** | Archives & About Canonicalization (`/archives`, `/about`) | 6 | T2.4, T3.1, S1 | PASS (100%) |
| **F6** | Next.js Redirects & Dead Routes (`/post/:id`, aliases) | 5 | T2.3, T3.5 | 3 Pending (`/article`, `/project`, `/posts`) |
| **F7** | Global Navigation Closure (Breadcrumbs, back buttons, Link) | 5 | T3.2, S5 | 2 Pending (HeroSection `<a>`, Article back) |
| **F8** | Link Security (`target="_blank" rel="noopener noreferrer"`) | 5 | T3.1, S3 | 2 Pending (ProjectCard rel, Admin rel) |
| **F9** | Admin Content Flow Consistency (shortId priority, canonical URLs) | 5 | T3.4, S4 | PASS (100%) |
| **F10** | Card Decoupling (`ProjectCard`, `ArticleFeedCard`, `MomentCard`) | 5 | T2.6, T3.1, S3 | 2 Pending (ActionMenu, InteractionBubble) |
| **F11** | Stream Polymorphic Dispatcher (Home feed type routing) | 5 | T3.2, S2 | PASS (100%) |
| **F12** | Moments Field Cleansing from Projects & Articles | 5 | T2.6, S3 | 3 Pending (Likes, comments, location) |
| **F13** | Complete Ad Code & Field Purge (0 remnants) | 5 | T2.2, T2.6 | PASS (100% - 0 matches) |
| **F14** | Visual Style & Layout Preservation | 5 | T2.6, S1 | PASS (100%) |
| **F15** | SSR/Client Deduplication & True Empty States | 5 | T2.4, S6 | 5 Pending (duplicate fetch, mock fallback) |
| **F16** | Race Condition & Stale State Prevention | 5 | T2.4, S2 | 2 Pending (AbortController, localStorage) |
| **F17** | White Screen Prevention & Hydration Consistency | 5 | T2.1, S1 | 2 Pending (ProfileFadeIn opacity-0, sanitize) |
| **F18** | Global Error & 404 Boundaries (`not-found.tsx`, `error.tsx`) | 5 | T2.5, S6 | 4 Pending (`not-found.tsx`, `error.tsx`) |
| **F19** | ISR Revalidation Completeness (`/articles`, `/moments`, `/projects`) | 5 | T2.5, T3.4, S4 | 3 Pending (`/articles`, `/moments`, `/projects`) |

---

## 4. Pending Implementation Defect Log for Milestone Workers

The following 26 tests represent real-world specifications currently failing against the baseline codebase. Implementers should use this list as their milestone checklist:

### Milestone 1 (Routing & Guards — F3, F4, F6)
1. `F3.4`: `/moments/[id]/page.tsx` needs a back button / link returning to `/moments`.
2. `F4.6`: Ensure server-side `redirect()` guards in `/articles/[id]/page.tsx` and `/moments/[id]/page.tsx` handle mismatched types.
3. `F6.3`: Add `/article` -> `/articles` alias redirect in `next.config.ts`.
4. `F6.4`: Add `/project` -> `/projects` alias redirect in `next.config.ts`.
5. `F6.5`: Add `/posts` -> `/moments` (or `/articles`) alias redirect in `next.config.ts`.

### Milestone 2 (Component Decoupling & Cleansing — F10, F12)
1. `F10.4` & `F12.1`: Remove `ActionMenu` and like button references from `ProjectCard.tsx`.
2. `F10.5` & `F12.2`: Remove `InteractionBubble` and `CommentSection` references from `ProjectCard.tsx`.
3. `F12.3`: Remove `post.location` references from `ProjectCard.tsx`.

### Milestone 3 (Navigation Closure & Security — F7, F8)
1. `F7.1`: In `src/components/home/HeroSection.tsx`, replace `<a href="/articles">` with Next.js `<Link href="/articles">`.
2. `F7.2`: In `src/app/articles/[id]/page.tsx`, add back button navigating to `/articles`.
3. `F8.2`: In `src/components/ProjectCard.tsx`, change `rel="noreferrer"` to `rel="noopener noreferrer"`.
4. `F8.3`: In `src/app/admin/articles/page.tsx`, add `rel="noopener noreferrer"` to external links.

### Milestone 4 (Data Flow, State & Robustness — F15, F16, F17, F18, F19)
1. `F15.1`: In `PostList.tsx`, skip client fetch on initial mount when `initialPosts` is provided.
2. `F15.2`: In `PostList.tsx`, update state when API returns empty array `[]` (`setPosts(json.data)`), do not early-return.
3. `F15.3` - `F15.5`: In `articles/page.tsx`, `projects/page.tsx`, `moments/page.tsx`, do not fall back to `mockPosts` when API returns `[]`.
4. `F16.1`: In `PostList.tsx`, implement `AbortController` or sequence IDs to cancel pending requests when switching categories.
5. `F16.5`: In `AboutReader.tsx`, do not unconditionally overwrite fresh server content with `localStorage`.
6. `F17.1`: In `ProfileFadeIn.tsx`, remove SSR `opacity-0` class to prevent client white screens on slow JS.
7. `F17.3`: In `sanitize.ts`, remove `if (typeof document === "undefined") return html` to ensure isomorphic hydration.
8. `F18.1` - `F18.4`: Create `src/app/not-found.tsx` and `src/app/error.tsx` in App Router.
9. `F19.1` - `F19.3`: In `src/app/api/revalidate/route.ts`, add `revalidatePath("/articles")`, `revalidatePath("/moments")`, `revalidatePath("/projects")`.

---

## 5. Verification Command for M5 Audit
When M1-M4 are completed, the final milestone M5 must execute:
```bash
cd /home/dual/Projects/Blog-personal/frontend
npm run test:e2e -- --strict
npm run lint
npm run build
```
Target: 0 failures, 100% pass rate across all 159 tests and 359 assertions.
