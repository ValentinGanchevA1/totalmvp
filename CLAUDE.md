Your high-level goals:

Help me refine and structure this vision into a coherent, shippable product.

Design the core UX around the real-time map and interactive avatars.

Scaffold a React Native app in TypeScript with a clean, scalable architecture.

Define and outline the backend (APIs, data models, services) to support real-time, location-based interactions.

Provide concrete example code snippets for both frontend and backend, including API integration.

Product context (do not rewrite, use it as a base):

The app is a location-based super-app.

Users appear as interactive avatars/dots on a real-time map.

Core capabilities:

Social networking & dating

Live streaming & content

Hyperlocal commerce & trading

Events & participation

Area-based notifications & alerts

Navigation, news, and entertainment

Goal: instant connections, transactions, entertainment, and hyperlocal experiences within the user’s immediate vicinity.

Your role & behavior:

Act as:

Senior product strategist

Mobile UX/UI designer

React Native + TypeScript lead

Backend/API architect

Always:

Ask clarifying questions before big decisions.

Challenge vague or over-broad ideas and help me prioritize.

Keep answers structured, concise, and implementation-oriented.

Prefer concrete flows, data structures, and code over generic advice.

Technical focus areas (must cover all):

App scaffolding (React Native + TypeScript):

Propose a project structure (folders, modules, key files).

Include example App.tsx and navigation setup (e.g., React Navigation).

Authentication & onboarding:

Authentication screen(s) (email/password or OAuth, you choose and justify).

Basic auth flow (login, signup, forgot password).

Example TypeScript components and minimal auth logic.

User profile creation & management:

Profile model (name, avatar, interests, visibility, location prefs, etc.).

Screens for creating/editing profile.

Example React Native components and form handling.

Map integration & real-time avatars:

Integrate a map library (e.g., react-native-maps or similar).

Show users as interactive avatars/dots on the map.

Basic interaction patterns (tap avatar → open profile, start chat, invite, etc.).

Discuss real-time updates strategy (polling vs WebSockets vs pub/sub).

Backend architecture:

Propose a backend stack (e.g., Node.js/Express/NestJS + database + real-time layer).

Define core services: auth, user profiles, location updates, messaging, payments, notifications, content/trending topics.

Provide example REST/GraphQL endpoints and data models (TypeScript interfaces or schemas).

User-to-user communication:

Direct messaging and/or real-time chat.

High-level data model for conversations/messages.

Example API routes and minimal frontend integration snippet.

Payment integration & commerce:

Suggest a payment provider (e.g., Stripe) and justify.

Outline flows for in-app purchases / transactions between users or with merchants.

Example backend endpoint and frontend call for a simple payment.

Area-based notifications & hyperlocal features:

Design how area-based notifications work (geofencing, radius-based topics, etc.).

Example data model for “areas”, “events”, and “notifications”.

Example backend logic and a frontend subscription/handling snippet.

Trending topics & community insights:

Define how trending topics are computed (location + time + engagement).

Example data structures and API endpoints.

Suggest UI patterns for surfacing community insights near the user.

Output style & constraints:

Use clear headings and step-by-step structure.

For each major section, provide:

Short explanation

Concrete decisions/recommendations

Example code snippets (frontend + backend where relevant).

Code snippets should be TypeScript for both React Native and backend.

Keep snippets minimal but realistic—enough to be copy-pasteable as a starting point.

Avoid long essays; focus on architecture, flows, and code.

Workflow for this session:

Ask me 3–5 clarifying questions about priorities (MVP scope, platforms, monetization, real-time depth, etc.).

Propose an MVP feature set for the first release of the super-app.

Define the app architecture (frontend + backend) at a high level.

Then:

Scaffold the React Native + TypeScript structure (with example code).

Design the auth + profile flows (with example code).

Show the map integration with avatars (with example code).

Outline backend services and provide example API endpoints + handlers.

Finally, help me turn this into a prioritized implementation roadmap (phased milestones).

---

# Codebase Reference

> This section documents the actual repository state. Update it when architecture changes.

## Repo Layout

```
totalmvp/                        ← monorepo root (Node >=20, .nvmrc = 20)
├── mobile/                      ← React Native 0.83, React 19, TS 5.8
├── backend/                     ← NestJS 11, TypeORM, TS 5.3
├── ARCHITECTURE.md              ← topology diagram + data-flow examples
├── SYSTEM_DESIGN.md             ← scale targets, stack decisions, ADRs
├── TECH_DEBT_AUDIT.md           ← scored backlog of known debt items
├── PRODUCT.md                   ← feature scope / roadmap
├── README.md                    ← quick-start guide
└── render.yaml                  ← Render.com blueprint (backend + DB)
```

- **App name:** G88 — a location-based social super-app
- **API base URL (prod):** `https://api.g88.app/api/v1`
- **Local backend:** `http://10.0.2.2:3001/api/v1` (Android emulator) or `http://localhost:3001/api/v1`
- No path aliases in mobile — all imports are relative. Backend uses `@/` → `src/` (tsconfig-paths + Jest moduleNameMapper).

---

## Mobile (`mobile/`)

**Stack:** React Native 0.83 · React 19 · TypeScript 5.8 · Redux Toolkit 2 · React Navigation 7

### Directory Structure

```
mobile/
├── App.tsx                          # Root: ErrorBoundary → Provider (Redux) → PersistGate → AppNavigator
├── src/
│   ├── api/
│   │   └── client.ts               # Axios instance, Bearer token interceptor, 401 refresh queue
│   ├── components/
│   │   ├── ErrorBoundary.tsx        # Global class-based error boundary
│   │   ├── ScreenErrorBoundary.tsx  # Per-screen boundary (trading screens wrapped with HOC)
│   │   ├── ActionHub.tsx            # Center FAB modal in tab bar
│   │   ├── VerificationBadge.tsx
│   │   └── SocialLinksDisplay.tsx
│   ├── features/                    # One folder per domain
│   │   ├── auth/        authSlice.ts · AuthScreen.tsx
│   │   ├── map/         mapSlice.ts · mapSelectors.ts · MapScreen.tsx · components/(CategoryMarker, EventMarker, UserMarker, FilterBar, QuickActionMenu)
│   │   ├── discovery/   discoverySlice.ts · DiscoveryScreen.tsx · FiltersModal · MatchesScreen · LikesReceivedScreen · UserProfileScreen
│   │   ├── profile/     profileSlice.ts · profileEditSlice.ts · types.ts · ProfileScreen · ProfileCreationScreen · ProfileEditScreen
│   │   ├── chat/        chatSlice.ts · ChatScreen.tsx
│   │   ├── interactions/ interactionsSlice.ts
│   │   ├── trading/     tradingSlice.ts · TradingScreen · CreateListingScreen · TradeOfferDetailScreen
│   │   ├── verification/ verificationSlice.ts · VerificationScreen · IdVerification · PhotoVerification · PhoneVerification · EmailVerification · SocialLinkingScreen
│   │   ├── gamification/ LeaderboardScreen · AchievementsScreen
│   │   ├── gifts/       GiftsScreen.tsx
│   │   ├── events/      EventsScreen.tsx · CreateEventScreen
│   │   ├── notifications/ NotificationsScreen.tsx
│   │   ├── trending/    TrendingScreen.tsx
│   │   ├── inbox/       InboxScreen.tsx
│   │   ├── market/      MarketScreen.tsx
│   │   ├── payments/    PremiumScreen.tsx
│   │   └── settings/    index.ts (barrel) · SettingsScreen · PrivacyScreen · HelpScreen · AboutScreen
│   ├── hooks/
│   │   ├── redux.ts                 # useAppDispatch + useAppSelector (typed)
│   │   └── useSocket.ts             # Socket.IO lifecycle, reconnect, auth handshake
│   ├── navigation/
│   │   └── AppNavigator.tsx         # RootStackParamList · conditional root · BottomTabNavigator
│   ├── store/
│   │   └── index.ts                 # Redux store + redux-persist config (STORE_VERSION=1)
│   └── utils/
│       ├── eventBus.ts              # Typed event emitter (auth:logout cross-module signal)
│       └── logger.ts               # no-op in prod; use instead of console.*
```

### Navigation (`src/navigation/AppNavigator.tsx`)

`RootStackParamList` is declared and exported here — **add new screens here first**.

Auth gate:
1. On mount: dispatch `restoreSession` → show `ActivityIndicator`
2. `!isAuthenticated` → `Auth` screen only
3. `isAuthenticated && !user?.profile?.completedAt` → `ProfileCreation` only
4. Else → `Main` (bottom tabs) + full stack

Tab bar (5 visible tabs + center FAB):
```
Map | Discover | [ActionHub FAB] | Market | Inbox | Profile
```
Active tab color: `#00d4ff`. Background: `#0a0a0f`. Icons from `MaterialCommunityIcons`.

Stack screens of note:
- `Chat { recipientId, recipientName? }` — 1:1 chat
- `UserProfile { userId }` — `presentation: 'modal'`
- `EventDetail { eventId }`
- `ListingDetail { listingId }` / `TradeOfferDetail { offerId }` — all trading screens wrapped with `withScreenErrorBoundary`

### Redux Store (`src/store/index.ts`)

9 slices: `auth · map · chat · discovery · profile · profileEdit · verification · interactions · trading`

**Persisted (whitelist):** `auth` + `discovery` only. All other slices reload from API on launch.

`STORE_VERSION = 1` — increment and add a migration function when a whitelisted slice's shape changes.

Typed hooks in `src/hooks/redux.ts`:
```typescript
useAppDispatch()   // returns AppDispatch
useAppSelector()   // typed against RootState
```

### API Client (`src/api/client.ts`)

Single Axios instance (`apiClient`). Timeout: 10 s.

- **Request interceptor:** reads `accessToken` from AsyncStorage → `Authorization: Bearer …`
- **Response interceptor:** on 401 → queue pending requests, call `POST /auth/refresh` with `refreshToken`, retry; on refresh failure → `EventBus.emit('auth:logout')`

Token keys in AsyncStorage: `accessToken`, `refreshToken`.

### Socket.IO (`src/hooks/useSocket.ts`)

Namespace `/chat`. Auth handshake: `{ auth: { token } }`.

Key events dispatched into Redux on receive:
- `message:receive` → `chatSlice.addMessage`
- `nearby:update` → `mapSlice.updateNearbyUser`
- `user:online` → `mapSlice.setUserOnline`
- `wave:receive` → `interactionsSlice.addReceivedWave`

Reconnection: `reconnectionAttempts: Infinity`, delay 1 s–5 s, manual reconnect on server disconnect.

### Feature Slices Reference

| Slice | Key async thunks | Persisted |
|---|---|---|
| `authSlice` | `login`, `register`, `restoreSession`, `fetchCurrentUser`, `toggleVisibility`, `deleteAccount` | Yes |
| `mapSlice` | `fetchMapData`, `updateUserLocation` | No |
| `discoverySlice` | `fetchDiscoveryProfiles`, `swipeUser`, `fetchMatches`, `fetchLikesReceived`, `activateBoost` | Yes |
| `profileSlice` | `submitProfile`, `uploadPhoto`, `fetchProfileCompletion` | No |
| `profileEditSlice` | `updateProfile` | No |
| `chatSlice` | `fetchConversations`, `fetchMessages`, `sendMessage` | No |
| `interactionsSlice` | `sendWave`, `fetchReceivedWaves`, `fetchUnreadCount` | No |
| `tradingSlice` | `fetchListings`, `createListing`, `fetchOffers`, `createOffer` | No |
| `verificationSlice` | `requestPhoneOtp`, `verifyPhone`, `uploadPhoto`, `uploadId` | No |

### Map Architecture

`mapSelectors.ts` provides memoized selectors via `createSelector`:
- `selectFilteredUserMarkers` — applies dating/trading filters; users with both goals get a primary + secondary marker (`-secondary` id suffix, `opacity: 0.5`)
- `selectFilteredEvents` — applies events filter

Category colors: `dating: '#FF69B4'` · `trading: '#4CAF50'` · `events: '#FF9800'` · `currentUser: '#007AFF'`

### Domain Types (`src/features/profile/types.ts`)

Enums: `Gender`, `SubscriptionTier`, `SocialProvider`
Interfaces: `User`, `UserProfile`, `UserSettings`, `UserBadges`, `SocialLink`, `LocationData`, `ProfileFormData`, `PhotoSlot`
Constants: `GENDER_OPTIONS`, `INTEREST_OPTIONS`, `GOAL_OPTIONS`, `SOCIAL_PROVIDER_CONFIG`

`User.profile.completedAt` being set is the gate for profile completion — checked in `AppNavigator`.

### Utilities

- `src/utils/logger.ts` — `logger.log/info/warn/error/debug`; all are no-ops in production. Use instead of `console.*` everywhere.
- `src/utils/eventBus.ts` — `EventBus` singleton: `.on(event, cb)` / `.off(event, cb)` / `.emit(event, ...args)`. Used for `auth:logout` cross-module signalling.

### Mobile Scripts

```bash
cd mobile
npm run android          # run on Android emulator/device
npm run ios              # run on iOS simulator
npm run start            # Metro bundler
npm run start:reset      # Metro with cleared cache
npm run test             # Jest
npm run lint             # ESLint
npm run version:patch    # bump version in package.json + android/ios manifests
npm run version:minor
npm run version:major
```

### TypeScript Conventions (Mobile)

- Components: `React.FC<Props>` with explicit props interface above the component
- Navigation: `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` for type-safe `navigate()`
- Redux: always via `useAppDispatch` / `useAppSelector` — never raw `useSelector`/`useDispatch`
- No path aliases — all imports are relative
- File naming: `PascalCase` for screens/components, `camelCase` for slices/hooks/utils
- No comments on self-evident code; comment only on non-obvious constraints or workarounds

---

## Backend (`backend/`)

**Stack:** NestJS 11 · TypeORM 0.3 · PostgreSQL + PostGIS · Redis · Socket.IO 4 · TypeScript 5.3 · Node >=20

### Directory Structure

```
backend/
├── src/
│   ├── main.ts                      # Bootstrap: port 3001, global prefix api/v1, pipes, CORS, Swagger
│   ├── app.module.ts                # Root module composition (imports all feature modules)
│   ├── common/                      # Shared services (injected across modules)
│   │   ├── cache.service.ts         # NestJS CacheModule wrapper (default TTL 60 s)
│   │   ├── email.service.ts         # SendGrid wrapper
│   │   ├── redis.service.ts         # ioredis wrapper (geo ops, pub/sub, sorted sets)
│   │   ├── s3.service.ts            # AWS S3 presigned URL generation + upload
│   │   ├── face-compare.service.ts  # AWS Rekognition CompareFaces
│   │   ├── twilio.service.ts        # SMS OTP
│   │   ├── health.controller.ts     # GET /api/v1/health → { status, timestamp, uptime }
│   │   └── filters/all-exceptions.filter.ts  # Normalizes all errors to { statusCode, timestamp, path, message }
│   ├── config/
│   │   ├── database.module.ts       # TypeORM forRootAsync (synchronize: false — use migrations)
│   │   └── typeorm.config.ts        # DataSource for migration CLI
│   ├── migrations/                  # 7 sequential TypeORM migrations (timestamps as prefixes)
│   ├── seeds/                       # seed.ts, users.seed.ts, fixture scripts
│   └── modules/                     # 17 feature modules
├── nest-cli.json
├── tsconfig.json                    # Path alias: @/* → src/*
└── package.json
```

### 17 Feature Modules (`src/modules/`)

| Module | Key files | Responsibility |
|---|---|---|
| `auth` | auth.service, auth.controller, guards/jwt-auth.guard | Email/password + Apple/Google OAuth, JWT issue/refresh |
| `users` | user.entity, user.service, user.controller | User CRUD, profile update, visibility toggle |
| `locations` | locations.service, locations.controller | Location writes (Redis GEOADD + PostGIS), nearby queries |
| `discovery` | discovery.service, entities/swipe + match | Swipe deck, swipe action, matches, likes, boost |
| `chat` | chat.gateway (WS `/chat`), chat.service, entities/conversation + message | Real-time 1:1 messaging |
| `events` | events.gateway (WS `/events`), events.service, entities/event+attendee+poll+question | Event CRUD, polls, Q&A |
| `interactions` | interactions.service, entities/wave | Waves (send, receive, unread count) |
| `social` | social.service | Follow/unfollow (social graph) |
| `payments` | payments.service | Stripe payment intents, Connect Express, webhooks |
| `verification` | verification.service | Phone OTP, photo verify (Rekognition), ID verify |
| `notifications` | geofence.service, entities/notification+geofence | Push notifications (Firebase), geofence sweeps |
| `analytics` | trending.service | Trending topics (geohash-bucketed Redis sorted sets, 24 h TTL) |
| `gamification` | gamification.service, entities/achievement+challenge | Badges, challenges, XP, leaderboard (Redis sorted sets) |
| `gifts` | gifts.service, entities/gift-catalog+user-wallet+gift-transaction | Gift marketplace, virtual wallet |
| `trading` | trading.service, entities/trade-listing+trade-offer+trade-favorite | Marketplace listings and offers |
| `skills` | skills.service | Dating/social/trader score computation + history |
| `admin` | entities/admin-user+audit-log | Admin panel, audit trail |

### Cross-Cutting Concerns (global in `main.ts` / `app.module.ts`)

| Concern | Implementation |
|---|---|
| Exception handling | `AllExceptionsFilter` → `{ statusCode, timestamp, path, message }` |
| Input validation | `ValidationPipe(whitelist, transform, forbidNonWhitelisted, enableImplicitConversion)` |
| Rate limiting | `ThrottlerGuard` (APP_GUARD); 3 tiers: 10/1 s · 40/10 s · 120/60 s |
| Caching | `CacheModule` global, TTL 60 s |
| Scheduling | `ScheduleModule` for geofence sweeps and trending recalculation |

Per-endpoint overrides: `@Throttle({ ... })` or `@SkipThrottle()`.

### Auth Chain

```
Request → JwtStrategy (passport-jwt, Bearer) → JwtAuthGuard → @CurrentUser() decorator → handler
```

Social login: client sends OAuth token → backend verifies via `google-auth-library` / Apple public keys → upsert user → return JWT pair.

JWT TTLs: access `15m`, refresh `7d` (secrets auto-generated by Render on first deploy).

### Geo Stack

**Location writes** (`POST /locations/update`):
1. `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` written to `user.location` (PostGIS `geography Point`)
2. `GEOADD user:locations lng lat userId` in Redis

**Nearby reads:**
- Primary: `RedisService.geoRadius(key, lng, lat, radiusKm)` → user IDs + distances
- Fallback: PostGIS `ST_Within` / `ST_DWithin` on `users` table

`user:online` = `lastSeenAt` within last 5 minutes.

### WebSocket Gateways

**`/chat`** (`chat.gateway.ts`):
- Auth: `client.handshake.auth.token` verified with `jwtService.verify`; client kicked on failure
- Rooms: each user auto-joins `user:{userId}`
- Events in: `message:send { recipientId, content, type }`
- Events out: `message:receive`, `user:online`, `user:offline`, `nearby:update`, `wave:receive`

**`/events`** (`events.gateway.ts`): rooms `event:{eventId}` for polls and Q&A.

Redis Socket.IO adapter enables multi-instance sync.

### Database

- PostgreSQL + PostGIS (`geography(Point,4326)` + GIST indexes)
- `synchronize: false` — all schema changes via migrations
- 29 TypeORM entities across modules
- Key JSONB columns on `User`: `profile`, `badges`, `settings` (field additions don't need migrations)

Migration commands:
```bash
cd backend
npm run migration:generate -- --name=DescriptiveName
npm run migration:run
npm run migration:revert
npm run seed
```

### Key Entity Fields (`User`)

`id (uuid)` · `email?` · `phone?` · `passwordHash (excluded from selects)` · `location (geography Point)` · `lastLatitude/Longitude` · `profile (jsonb)` · `badges (jsonb)` · `settings (jsonb)` · `verificationScore (0–100)` · `subscriptionTier` · `isVisible` · `isActive` · `isBanned` · `boostedUntil` · `xp` · `level` · `datingScore` · `socialScore` · `traderScore`

### Backend Scripts

```bash
cd backend
npm run start:dev          # NestJS watch mode (hot reload)
npm run build              # nest build → dist/
npm run start              # node dist/main.js
npm run test               # Jest (*.spec.ts)
npm run test:cov           # Jest with coverage
npm run test:e2e           # Jest e2e config
npm run lint               # ESLint --fix
npm run migration:generate -- --name=Foo
npm run migration:run
npm run migration:revert
npm run seed
```

### Environment Variables (Backend)

```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgres://...          # Render injects; local uses DB_HOST/PORT/USER/PASSWORD/NAME
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
SENDGRID_API_KEY=...
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=g88-uploads-production
GOOGLE_CLIENT_ID=...
CORS_ORIGINS=...                     # Comma-separated allowed origins
```

---

## Key API Endpoints

All routes under `/api/v1`. Swagger docs at `/api/docs` (local dev).

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | No | |
| POST | `/auth/login` | No | |
| POST | `/auth/refresh` | No | `{ refreshToken }` |
| GET | `/auth/me` | JWT | Full user |
| GET | `/users/me` | JWT | |
| PATCH | `/users/me/visibility` | JWT | `{ isVisible }` |
| DELETE | `/users/me` | JWT | Account deletion |
| POST | `/users/profile` | JWT | Create/update profile |
| POST | `/locations/update` | JWT | `{ latitude, longitude }` |
| GET | `/locations/map-data` | JWT | `?latitude&longitude&radiusKm&limit` → `{ users[], events[] }` |
| GET | `/discovery/profiles` | JWT | Swipe deck |
| POST | `/discovery/swipe` | JWT | `{ targetId, type: like/pass/super_like }` |
| GET | `/discovery/matches` | JWT | |
| POST | `/interactions/wave` | JWT | `{ toUserId }` |
| GET | `/interactions/waves/received` | JWT | |
| GET | `/health` | No | Render health check |

---

## Realtime Data Flow Examples

**Send a wave:**
`interactionsSlice.sendWave(userId)` → `POST /interactions/wave` → backend inserts `Wave` + `server.to('user:{recipientId}').emit('wave:receive', wave)` → recipient's `useSocket` dispatches `addReceivedWave`

**Map refresh:**
`mapSlice.fetchMapData({ lat, lng, radius })` → `GET /locations/map-data` → Redis GEORADIUS → PostgreSQL hydration + `EventsService.findNearbyEvents` → `mapSlice` updates markers → `mapSelectors` recomputes filtered markers

**Photo verification:**
User uploads selfie → `POST /verification/photo` → `S3Service.getPresignedUrl` → mobile PUTs to S3 → mobile POSTs S3 key → `FaceCompareService.compare(idPhotoUrl, selfieUrl)` (Rekognition) → on match, updates `user.badges.photo = true` + increments `verificationScore`

---

## CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

Triggers: push to `main` or `claude/**`; PRs targeting `main`.

| Job | Steps |
|---|---|
| Backend | `npm ci` → lint (advisory) → `tsc` typecheck (advisory) → `nest build` → jest |
| Mobile | `npm ci` → lint (advisory) → `tsc --noEmit` (advisory) → jest |

Lint and typecheck are `continue-on-error: true` — advisory only, do not block merge (tech debt M9).

### Deployment (Render.com — `render.yaml`)

| Resource | Config |
|---|---|
| Web service `g88-backend` | Node 20, `rootDir: backend`, build: `npm install && npm run build`, start: `node dist/main` |
| Health check | `GET /api/v1/health` |
| PostgreSQL `g88-db` | Managed, Oregon region |

Manual env vars set in Render dashboard: Stripe, Twilio, AWS, SendGrid, Google OAuth.

### Mobile Release

Android release: `cd android && gradlew.bat bundleRelease` → AAB. Windows only (`scripts/build-release.bat`).
Version bumping: `npm run version:patch/minor/major` updates `package.json` + Android `build.gradle` + iOS `Info.plist`.

---

## External Integrations

| Service | Purpose | Backend entry point |
|---|---|---|
| Stripe | Payments, Connect Express payouts | `modules/payments/payments.service.ts` |
| AWS S3 | Media storage (photos, ID docs) | `common/s3.service.ts` |
| AWS Rekognition | Face comparison for ID verification | `common/face-compare.service.ts` |
| Twilio | SMS OTP | `common/twilio.service.ts` |
| SendGrid | Transactional email | `common/email.service.ts` |
| Firebase | Android push notifications | `modules/notifications/` |
| Google OAuth | Social sign-in | `modules/auth/` + `google-auth-library` |

---

## Known Critical Debt

| ID | Severity | Issue |
|---|---|---|
| C2 | Critical | Zero automated tests in backend (17 modules, no `.spec.ts`); single smoke test in mobile |
| C3 | Critical | No production observability — no Sentry, no structured logging; `logger.ts` silences everything in prod |
| H1 | High | React Native 0.83 + React 19 are bleeding-edge; native lib compatibility is fragile |
| H3 | High | Duplicate `email.service.ts` exists in both `common/` and `modules/common/` |
| M9 | Medium | CI lint/typecheck advisory-only — won't block merges |
| M10 | Medium | Mobile release builds are Windows-only (`build-release.bat`); no EAS/fastlane |

Full scored audit: `TECH_DEBT_AUDIT.md`