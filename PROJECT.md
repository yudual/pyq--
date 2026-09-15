# Project: Blog Frontend Optimization

## Architecture
Next.js App Router (16+) with React 19, TypeScript, and Tailwind CSS.
- **Frontend Directory**: `/home/dual/Projects/Blog-personal/frontend`
- **Data Layer**: Express REST API (`/api/posts`, `/api/articles`, etc.) + Next.js Server Components (SSR/SSG/ISR) + Client Components for interactive feeds and admin.
- **Routing Structure**:
  - `/` (Home aggregator feed)
  - `/articles` (Articles list)
  - `/articles/[id]` (Article reading detail)
  - `/projects` (Projects showcase list)
  - `/projects/[id]` (Dedicated project detail page)
  - `/moments` (Moments feed)
  - `/moments/[id]` (Moment detail page)
  - `/archives` (Timeline index only)
  - `/about` (About page)
  - `/admin/*` (Content management)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Article Canonical Routes | `/articles` list & `/articles/[id]` canonical detail; cards route strictly to detail | M1 | ORIGINAL_REQUEST §R1 |
| F2 | Project Canonical Routes & Split | `/projects` list, create `/projects/[id]` detail page, distinguish internal vs external links (`target="_blank" rel="noopener noreferrer"`) | M1 | ORIGINAL_REQUEST §R1, §R2 |
| F3 | Moments Canonical Routes & Isolation | `/moments` list & `/moments/[id]` detail, pure moments interaction, add back button | M1 | ORIGINAL_REQUEST §R1 |
| F4 | Cross-Channel Route Guards | Server-side redirect in `/moments/[id]`, `/articles/[id]`, `/projects/[id]` based on item type/category | M1 | Survey Route Explorer |
| F5 | Archives & About Canonicalization | `/archives` as index only, route items to canonical detail, add line-clamp to long text; `/about` clean | M1 | ORIGINAL_REQUEST §R1 |
| F6 | Next.js Redirects & Dead Routes | Update `next.config.ts` redirects for `/project`, `/article`, `/moment`, `/posts`, `/post/:id` | M1 | ORIGINAL_REQUEST §R1 |
| F7 | Global Navigation Closure | Breadcrumbs, back buttons, header/sidebar/footer, fix `HeroSection` `<a>` -> `<Link>` | M3 | ORIGINAL_REQUEST §R2 |
| F8 | Strict Link Distinction | Internal uses Next.js Link, external uses `target="_blank" rel="noopener noreferrer"` | M3 | ORIGINAL_REQUEST §R2 |
| F9 | Admin Content Flow Consistency | Admin create/edit/preview/delete correctly links to canonical URLs with shortId, safe 401 | M3 | ORIGINAL_REQUEST §R2 |
| F10 | Card Component Decoupling | Decouple `PostCard.tsx` into `MomentCard.tsx`, `ArticleFeedCard.tsx`, and clean `ProjectCard.tsx` | M2 | ORIGINAL_REQUEST §R3 |
| F11 | Stream Polymorphic Dispatcher | Upgrade `PostList.tsx` / `FeedDispatcher` for home and list streams to dispatch by type | M2 | ORIGINAL_REQUEST §R3 |
| F12 | Moments Field Cleansing | Strip likes, comments, interaction bubbles, locations, emojis from project cards/views & article cards | M2 | ORIGINAL_REQUEST §R3 |
| F13 | Complete Ad & Dead Code Purge | Enforce 0 legacy ad fields, components, styles, or text across frontend | M2 | ORIGINAL_REQUEST §R3 |
| F14 | Visual Style Preservation | Strictly preserve existing visual style, colors, layout, fonts, margins | M2 | ORIGINAL_REQUEST §R3 |
| F15 | SSR/Client Deduplication & Real Empty States | Remove duplicate client fetch on mount, eliminate fake fallback mocks to show true empty states | M4 | ORIGINAL_REQUEST §R4 |
| F16 | useEffect Race Condition & Stale State Fix | Add AbortController/sequence ID, handle empty category array properly without stale overwrite | M4 | ORIGINAL_REQUEST §R4 |
| F17 | White Screen & Hydration Fixes | Fix `ProfileFadeIn` SSR `opacity-0`, fix `sanitize.ts` SSR vs client hydration mismatch | M4 | ORIGINAL_REQUEST §R4 |
| F18 | Global Error & 404 Boundaries | Implement custom `not-found.tsx` and `error.tsx` in App Router | M4 | ORIGINAL_REQUEST §R4 |
| F19 | ISR Revalidation Completeness | Add `/articles`, `/articles/[id]`, `/moments`, `/moments/[id]`, `/projects` to `api/revalidate` | M4 | ORIGINAL_REQUEST §R4 |
| F20 | E2E Test Suite (Tiers 1-4) | Requirements-driven test suite validating canonical routes, navigation, decoupling, and robustness | E2E | ORIGINAL_REQUEST §Verification |
| F21 | Final Verification & Hardening | 100% E2E tests pass, Tier 5 adversarial coverage, `npm run build` and `npm run lint` 0 errors | M5 | ORIGINAL_REQUEST §Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Build opaque-box test runner & test cases for R1-R4 (Tiers 1-4), publish TEST_READY.md | none | DONE (TEST_READY.md published) |
| M1 | Canonical Routes & Route Guards | Implement `/projects/[id]`, cross-channel guards in details, next.config redirects, archives routing | none | DONE (Passed Gate R2) |
| M2 | Component Decoupling & Field Cleansing | Decouple cards (`MomentCard`, `ArticleFeedCard`, `ProjectCard`), polymorphic feed dispatcher, strip moment fields, 0 ad code | M1 | DONE (Passed Gate) |
| M3 | Global Navigation Closure & Link Integrity | Breadcrumbs & back buttons, fix internal/external links (`HeroSection`, `noopener noreferrer`), admin consistency | M2 | DONE (Passed Gate) |
| M4 | Data Flow, Hydration & Robustness | Remove duplicate fetches, eliminate fake fallback mocks, fix race conditions, fix white screen & hydration, add error/not-found | M3 | DONE (Passed Gate) |
| M5 | Final Milestone: E2E Pass & Hardening | Pass 100% E2E tests, Tier 5 adversarial hardening, verify `npm run build` and `npm run lint` with 0 errors | E2E, M4 | IN_PROGRESS |

## Interface Contracts
### Route Resolution Contract
- Post object: `{ id, shortId, type: "article" | "moment", category: string, linkCard?: { url: string } }`
- Canonical URL mapping:
  - If `category === "项目"` or `type === "project"`:
    - Internal detail: `/projects/${post.shortId || post.id}`
    - External project: `post.linkCard.url` (opened in new tab if external)
  - If `type === "article"`:
    - Detail: `/articles/${post.shortId || post.id}`
  - If `type === "moment"`:
    - Detail: `/moments/${post.shortId || post.id}`

### Feed Dispatcher Contract
- `<FeedDispatcher post={post} index={index} />`:
  - `post.category === "项目"` -> `<ProjectCard post={post} index={index} />`
  - `post.type === "article"` -> `<ArticleFeedCard post={post} index={index} />`
  - Default / `post.type === "moment"` -> `<MomentCard post={post} index={index} />`

### Data Fetching Contract
- SSR Server Component fetches `page=1&limit=10`.
- Client `PostList` receives `initialPosts` and `initialHasMore`.
- Client MUST NOT re-fetch page 1 on initial mount if `initialPosts` is provided.
- If backend returns empty array `[]`, render genuine empty state (e.g. "暂无内容"), DO NOT fall back to `mockPosts`.

## Code Layout
- Routes: `frontend/src/app/(routes)`
  - `src/app/page.tsx`
  - `src/app/articles/page.tsx`
  - `src/app/articles/[id]/page.tsx`
  - `src/app/projects/page.tsx`
  - `src/app/projects/[id]/page.tsx` (NEW)
  - `src/app/moments/page.tsx`
  - `src/app/moments/[id]/page.tsx`
  - `src/app/archives/page.tsx`
  - `src/app/about/page.tsx`
  - `src/app/not-found.tsx` (NEW)
  - `src/app/error.tsx` (NEW)
- Components: `frontend/src/components`
  - `PostList.tsx`
  - `PostCard.tsx` -> `MomentCard.tsx`
  - `ArticleFeedCard.tsx`
  - `ProjectCard.tsx`
  - `profile/ProfilePostCard.tsx`
  - `profile/ProfileFadeIn.tsx`
  - `home/HeroSection.tsx`
  - `post-detail/PostDetail.tsx`
- Config & Lib:
  - `frontend/next.config.ts`
  - `frontend/src/lib/sanitize.ts`
  - `frontend/src/app/api/revalidate/route.ts`
