# E2E Test Infra: Blog Frontend Optimization

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from ORIGINAL_REQUEST.md.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workloads.
- No dependency on internal implementation design details; tests exercise HTTP / Next.js routes, canonical redirects, navigation URLs, component visual boundary contracts, and data-flow integrity.

## Feature Inventory Mapping
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------|:------:|:------:|:------:|
| 1 | Article Canonical Routes (/articles, /articles/[id]) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ |
| 2 | Project Canonical Routes (/projects, /projects/[id], external links) | ORIGINAL_REQUEST §R1, §R2 | ≥5 | ≥5 | ✓ |
| 3 | Moments Canonical Routes (/moments, /moments/[id]) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ |
| 4 | Cross-Channel Route Guards (307/308 redirects) | Survey Routes §3 | ≥5 | ≥5 | ✓ |
| 5 | Archives & About Canonicalization (/archives, /about) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ |
| 6 | Next.js Redirects & Dead Routes (/post/:id, aliases) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ |
| 7 | Global Navigation Closure (Breadcrumbs, back buttons, links) | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ |
| 8 | Link Security (target="_blank" rel="noopener noreferrer") | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ |
| 9 | Admin Content Flow Consistency | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ |
| 10 | Card Decoupling (MomentCard, ArticleFeedCard, ProjectCard) | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ |
| 11 | Stream Polymorphic Dispatcher (Home feed multi-card dispatch) | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ |
| 12 | Moments Field Cleansing from Projects & Articles | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ |
| 13 | Complete Ad Code & Field Purge (0 remnants) | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ |
| 14 | Visual Style & Layout Preservation | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ |
| 15 | SSR/Client Deduplication & True Empty States | ORIGINAL_REQUEST §R4 | ≥5 | ≥5 | ✓ |
| 16 | Race Condition & Stale State Prevention | ORIGINAL_REQUEST §R4 | ≥5 | ≥5 | ✓ |
| 17 | White Screen Prevention & Hydration Consistency | ORIGINAL_REQUEST §R4 | ≥5 | ≥5 | ✓ |
| 18 | Global Error & 404 Boundaries (not-found, error) | ORIGINAL_REQUEST §R4 | ≥5 | ≥5 | ✓ |
| 19 | ISR Revalidation Completeness | ORIGINAL_REQUEST §R4 | ≥5 | ≥5 | ✓ |

## Test Architecture
- Test Runner: Node.js / Playwright / Jest / custom runner in `frontend/tests/e2e/runner.js` or `npm test`
- Pass/Fail Semantics: Exit code 0 on all tests passing, non-zero on failure.
- Test Cases Location: `frontend/tests/e2e/`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Direct Deep Link Walkthrough (Deep refresh of article, project, moment, archives) | F1, F2, F3, F5, F17 | High |
| 2 | Category & Filter Fast Switching (Stress testing rapid filter clicks without stale data overwrite) | F15, F16 | High |
| 3 | Project Card External vs Internal Navigation Walkthrough | F2, F8, F10, F12 | Medium |
| 4 | Admin Edit -> Preview -> Canonical Route Transition | F1, F2, F3, F9, F19 | High |
| 5 | Browser History (Back / Forward) Navigation between Feed & Details | F1, F3, F7, F17 | High |
| 6 | True Empty State Display (Zero-data rendering without mock fallback) | F15, F18 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature
- Tier 3: Pairwise interaction tests covering cross-feature interactions
- Tier 4: ≥6 realistic application scenarios
- Total Target: >200 automated test assertions
