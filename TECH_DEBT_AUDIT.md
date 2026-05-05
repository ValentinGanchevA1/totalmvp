# Tech debt audit — G88 (totalmvp)

**Scope:** all 6 categories (code, architecture, tests, dependencies, docs, infrastructure).
**Appetite:** dedicated refactor sprint. Plan below is sized for ~2 weeks with 2 engineers (≈40 ideal-engineer-days), with quick wins front-loaded.
**Method:** static survey of `backend/src` (122 files) and `mobile/src` (78 files), plus root configs, package manifests, and `render.yaml`. Findings cite real file paths so each can be reproduced.

## Executive summary

The MVP is functionally broad — 17 backend modules, matching mobile features — but several foundational choices will bite you in production:

1. **NestJS major-version mismatch** between `@nestjs/core@11` and `@nestjs/common@10` / `@nestjs/platform-*@10` is a runtime-instability time bomb (CRITICAL).
2. **Mobile is on bleeding-edge React 19 + RN 0.83**; many native libs lag this combo, so any dep upgrade is a coin flip (HIGH).
3. **Effectively zero automated tests** — one mobile smoke test, no `*.spec.ts` in backend at all, despite Jest being configured (HIGH).
4. **No production observability** — 39 raw `console.*` calls in mobile, App.tsx has a `// TODO: Send to error reporting service` next to the global error handler. You will not know when prod breaks (HIGH).
5. **Type erosion** — 79 `: any` annotations including SDK clients (`s3Client: any`, `twilio: any`, `rekognition: any`) wipe out the value of typing those APIs (MEDIUM).
6. **Documentation chaos was already a debt signal** — the source repo has 10+ overlapping checklist MDs at root; this audit consolidates the durable parts into `PRODUCT.md` / `README.md` / `ARCHITECTURE.md` and drops the cruft.

The good news: the architecture is sound. NestJS module boundaries are clear, Redux Toolkit slices are organized per feature, geo + realtime are wired correctly (PostGIS + Redis Socket.IO adapter). Most of the debt is *layering* — observability, tests, version hygiene — not structural.

---

## Findings

Scoring: **Impact** (team velocity drag, 1–5), **Risk** (what breaks if ignored, 1–5), **Effort** (1 = hours, 5 = weeks). **Priority = (Impact + Risk) × (6 − Effort)**.

### Critical (priority ≥ 35)

| # | Category | Finding | Evidence | I | R | E | P |
|---|---|---|---|---|---|---|---|
| C1 | Dependency | NestJS version split: `core@11` with `common@10`, `platform-express@10`, `platform-socket.io@10`. v10/v11 have breaking signature changes — runtime errors are non-deterministic | `backend/package.json` | 4 | 5 | 1 | **45** |
| C2 | Tests | No backend tests. Jest configured but zero `*.spec.ts` exist across 17 modules. Only test in repo is `mobile/__tests__/App.test.tsx` (smoke) | `find backend/src -name '*.spec.ts'` → empty | 5 | 5 | 4 | **20** |
| C3 | Infrastructure | No error/APM reporting wired up. `App.tsx` has `// TODO: Send to error reporting service (e.g., Sentry, Crashlytics)`; backend uses default Nest console logger; 39 `console.*` calls in mobile | `mobile/App.tsx`, `backend/src/main.ts` | 5 | 5 | 2 | **40** |

C2 is high impact / high risk but its effort score (4) drops it below C1 and C3 in the formula; it is still treated as critical because shipping mobile updates without regression coverage is acutely dangerous.

### High (priority 20–34)

| # | Category | Finding | Evidence | I | R | E | P |
|---|---|---|---|---|---|---|---|
| H1 | Dependency | Mobile on RN 0.83 + React 19 (latest majors). Native libs frequently lag this combo; any upgrade may break the build | `mobile/package.json` | 4 | 4 | 3 | **24** |
| H2 | Architecture | Backend ships `dist/` checked into source alongside `src/`. Stale build can be deployed; hides git noise | repo had `backend/dist/` (excluded from totalmvp via `.gitignore`) | 3 | 4 | 1 | **35** |
| H3 | Architecture | Two `email.service.ts` exist (`common/email.service.ts` and `modules/common/email.service.ts`) — duplicated logic, drift risk | `find backend/src -name email.service.ts` | 3 | 3 | 1 | **30** |
| H4 | Architecture | `users` module and `profiles` module overlap — both manipulate the user record, no clear ownership boundary | `backend/src/modules/{users,profiles}` | 4 | 3 | 3 | **21** |
| H5 | Code | Throttler tier identical for unauthenticated endpoints (login, OTP request) and authed traffic. No `@SkipThrottle` / `@Throttle` overrides — OTP brute-force and signup spam are open | `backend/src/app.module.ts` ThrottlerModule config | 3 | 5 | 2 | **32** |
| H6 | Code | `redux-persist` configured with no `version` / `migrate` — schema changes in slices will corrupt existing installs on app update | `mobile/src/store/index.ts` | 4 | 4 | 2 | **32** |
| H7 | Docs | Source repo has 10+ root-level "release checklist" MDs (`BUILD_NOW.md`, `IMMEDIATE_ACTION_CHECKLIST.md`, `FINAL_PRODUCTION_CHECKLIST.md`, …) overlapping in scope — onboarding signal-to-noise is poor | source repo root | 4 | 2 | 1 | **30** |

### Medium (priority 10–19)

| # | Category | Finding | Evidence | I | R | E | P |
|---|---|---|---|---|---|---|---|
| M1 | Code | 79 `: any` annotations. Worst offenders are SDK wrappers (`s3Client: any`, `rekognitionClient: any`, `client: any`) that sacrifice typing for those APIs | `grep -rE ": any[^a-zA-Z]" src` | 3 | 2 | 3 | **15** |
| M2 | Code | God-screens in mobile: `DiscoveryScreen.tsx` 805 LOC, `ProfileScreen.tsx` 779 LOC, `GiftsScreen.tsx` 743 LOC. Mix data fetching, slice access, validation, and UI | mobile/src/features/* | 3 | 2 | 4 | **10** |
| M3 | Code | Mobile API client has no retry/backoff or offline queue. Waves/likes silently fail offline | `mobile/src/api/client.ts` | 3 | 2 | 2 | **20** |
| M4 | Code | Empty `srcmigrations/` typo dir alongside `migrations/` in source; nothing references it but it ships in builds | source repo `backend/srcmigrations/` (dropped from totalmvp) | 1 | 1 | 1 | **10** |
| M5 | Code | 6 unresolved `TODO`/`FIXME` markers in production code paths (`ChatScreen`, `NotificationsScreen`, `SettingsScreen`, `ActionHub`, `profiles.*`) | `grep -rE "TODO\|FIXME" src` | 2 | 2 | 2 | **16** |
| M6 | Dependency | Prettier version skew: backend 3.x, mobile 2.8.8. Pre-commit formatting will keep flipping | both `package.json` | 2 | 1 | 1 | **15** |
| M7 | Dependency | ESLint 8.x in both apps. v9 (flat config) is current LTS; eco upgrades will block on this | both `package.json` | 2 | 2 | 3 | **12** |
| M8 | Infrastructure | `render.yaml` defines one web service + one DB. No staging env, no preview environments. All deploys go straight to prod | `render.yaml` | 3 | 3 | 2 | **24** |
| M9 | Infrastructure | No CI: `.github/` contains only `agents/` and `copilot-instructions.md` — no `workflows/`. No automated lint/typecheck/test gate before merge | `.github/` listing | 4 | 3 | 2 | **28** |
| M10 | Infrastructure | Mobile builds via Windows `.bat` scripts only. No EAS / fastlane / GitHub Actions runner. Builds depend on a single laptop | `mobile/scripts/build-release.bat` | 3 | 3 | 3 | **18** |
| M11 | Code | `main.ts` CORS allowlist is a hardcoded array gated on `NODE_ENV === 'production'`. Adding a domain requires a code deploy | `backend/src/main.ts` | 2 | 2 | 1 | **20** |
| M12 | Tests | No integration test against PostGIS — discovery/nearby queries depend on indexes and `ST_DWithin`; regressions ship silently | absence | 3 | 3 | 4 | **12** |

### Low (priority < 10)

| # | Finding | Reason it stays low |
|---|---|---|
| L1 | `package.json` author empty, `license: UNLICENSED` | cosmetic |
| L2 | Inline color literals in mobile screens | RN convention; theming refactor isn't urgent |
| L3 | TypeORM 0.3.28 — minor upgrades available | API stable, no concrete pain |
| L4 | Health controller is a single endpoint, doesn't probe DB/Redis | Render's health-check path works for now |

---

## Phased remediation plan

Tuned to the dedicated refactor sprint. Each phase is roughly one week of one engineer; run them in parallel if you have the people.

### Phase 0 — Quick wins (day 1, hours not days)

These unblock the rest and make the audit visible to everyone.

1. **Pin NestJS to one major** (C1). Bump every `@nestjs/*` to `^11.x`, run `npm i`, fix the handful of breaking imports (mainly `Module` decorator typing and `Logger` namespace). Validates with `nest build`.
2. **Delete `backend/dist/` from git, add to `.gitignore`** (H2). Already in `totalmvp/.gitignore` — apply the same change to the live repo and force-push the cleanup.
3. **Drop the empty `srcmigrations/` typo dir** (M4).
4. **Align Prettier versions** (M6). Move both packages to `^3.x`, regen format.
5. **Consolidate root-level setup MDs** (H7). Done in totalmvp via `PRODUCT.md` + `README.md` + `ARCHITECTURE.md`. Apply back to source repo by deleting `BUILD_NOW.md`, `IMMEDIATE_ACTION_CHECKLIST.md`, `FINAL_PRODUCTION_CHECKLIST.md`, `PRODUCTION_*` etc. and replacing with the curated three.
6. **Fix the 6 dangling TODOs** (M5) or convert to issues.

### Phase 1 — Observability & safety net (week 1)

Everything else is risky to refactor without these.

7. **Wire Sentry** (C3). Single SDK in mobile (`@sentry/react-native`) and backend (`@sentry/node` as a Nest interceptor). Replace the `console.error('[Global Error]', …)` block in `App.tsx` with `Sentry.captureException`. Strip the 39 mobile `console.*` calls behind a `__DEV__` guard or a typed `logger.ts`.
8. **Throttle hardening for unauth routes** (H5). Add `@Throttle({ short: { ttl: 60000, limit: 5 } })` to `/auth/login`, `/auth/otp/request`, `/auth/forgot-password`. Strict per-IP + per-phone-number for OTP.
9. **Backbone tests** (C2 partial). Add `*.spec.ts` covering: `auth.service` token issuance/refresh, `discovery.service` nearby query (with PostGIS test fixture), `chat.service` message persistence, `payments.service` Stripe webhook signature verification. Aim for these 4 first — they're the highest-blast-radius surfaces.
10. **GitHub Actions CI** (M9). Three jobs: lint, typecheck, test. Block merge to `main` on green.

### Phase 2 — Architecture cleanup (week 2)

11. **Merge duplicate `email.service.ts`** (H3). Keep the `common/` one, delete `modules/common/email.service.ts`, fix imports.
12. **Decide users vs profiles boundary** (H4). One owns auth identity (creds, tokens, sessions); the other owns presentation (photos, bio, interests, goals, location). Move methods accordingly. Add an ADR (`docs/adr/0001-users-vs-profiles.md`).
13. **redux-persist migrations** (H6). Set `version: 1`, write a `migrate` callback. Document the convention so future slice changes have a recipe.
14. **Type the SDK wrappers** (M1 partial). Replace `private s3Client: any` with `private s3Client: S3Client` in `s3.service.ts`; same for Rekognition + Twilio. Removes ~12 of the 79 `any`s and reinstates type safety on the most-called wrappers.
15. **Move CORS allowlist to env** (M11). `CORS_ORIGINS=https://g88.app,…` parsed once.

### Phase 3 — Resilience & build pipeline (week 2, parallelizable)

16. **Mobile API client retries** (M3). Axios interceptor with exponential backoff for 5xx/network, plus a tiny offline queue persisted via AsyncStorage for waves/likes (idempotent, dedup by client-id).
17. **Render staging env** (M8). Duplicate the blueprint as `staging` plan, add a separate DB. Promote via PR.
18. **Move mobile builds off Windows-only `.bat`** (M10). Either EAS Build or a GitHub Actions matrix (macos-latest for iOS, ubuntu-latest for Android). Keep the `.bat` as a local convenience.

### Phase 4 — Backlog (track but don't sprint)

- Break up god-screens (M2) — do it opportunistically when you touch them for features.
- ESLint 9 / flat config (M7) — wait for `@typescript-eslint` 8 stable + your editor plugins.
- React 19 / RN 0.83 risk monitoring (H1) — don't downgrade now, but pin every native dep to known-good versions and add a Renovate / dependabot config that opens PRs you actually review.
- Integration test layer for PostGIS (M12) — set up `testcontainers-node` with a PostGIS image once the unit-test foundation is in.

---

## Sprint allocation cheat sheet

| Day | Owner A (backend) | Owner B (mobile/infra) |
|---|---|---|
| 1 | C1 NestJS pin · H2 dist cleanup · M4 typo dir | M6 Prettier · H7 docs consolidation · M5 TODOs |
| 2 | H5 throttle · M11 CORS env | C3 Sentry mobile + console cleanup |
| 3 | C2 auth.service tests | C3 Sentry backend Nest interceptor |
| 4 | C2 discovery.service tests with PostGIS | M9 GitHub Actions CI |
| 5 | C2 chat.service tests · ADR draft | H6 redux-persist migrations |
| 6 | H3 email merge · H4 users/profiles boundary | M3 axios retry + offline queue |
| 7 | M1 typed SDK wrappers | M8 Render staging env |
| 8 | C2 payments webhook test | M10 mobile CI build |
| 9 | buffer / spillover | buffer / spillover |
| 10 | demo + writeup | demo + writeup |

---

## What's intentionally not in scope

- Rewriting any module from scratch. The architecture is fine; the debt is configuration, observability, and tests.
- Switching state libraries (Redux is working).
- Replacing Render. Single-region starter plan is fine for current load; revisit when you have load data.
- Internationalization, accessibility audit, design-system extraction. All real work, none urgent.
