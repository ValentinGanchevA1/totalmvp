# Architecture

## Topology

```
┌────────────────┐         REST + WebSocket          ┌──────────────────────┐
│  React Native  │ ─────────────────────────────────▶│  NestJS  (api/v1)    │
│  (Redux+Persist│ ◀─────────────────────────────────│  Throttler + JWT     │
│   axios+socket)│                                   │  Validation pipe     │
└────────────────┘                                   └─────────┬────────────┘
       │                                                       │
       │ Firebase Cloud Messaging                              │
       ▼                                              ┌────────┴─────────┐
   Push token                                         │  TypeORM         │
                                                      ▼                  ▼
                                              ┌──────────────┐    ┌─────────────┐
                                              │ PostgreSQL   │    │ Redis       │
                                              │ + PostGIS    │    │ cache+queue │
                                              └──────────────┘    │ + socket.io │
                                                                  │ adapter     │
                                                                  └─────────────┘
External: Stripe · AWS S3 · AWS Rekognition · Twilio · SendGrid · Apple/Google/FB OAuth
```

## Backend (NestJS)

`backend/src/app.module.ts` is the composition root. 17 feature modules, plus `common/` for shared services, `config/` for DB, `migrations/` for schema, `seeds/` for fixtures.

Cross-cutting:

- `AllExceptionsFilter` — global error filter, normalized JSON shape
- `ValidationPipe` — whitelist + transform + forbid non-whitelisted, applied globally
- `ThrottlerGuard` (APP_GUARD) — three windows: 10/s, 40/10s, 120/min
- `CacheModule` — global, 60s default TTL
- `ScheduleModule` — for geofence sweeps and trending recalculation

Realtime:

- `chat.gateway.ts` — Socket.IO conversation rooms
- `events.gateway.ts` — live event updates (polls, Q&A, attendance)
- Redis adapter so multiple backend instances stay in sync

Auth chain:

- `JwtStrategy` validates token → attaches user → `JwtAuthGuard` on protected routes
- `@CurrentUser()` decorator surfaces the user
- Social providers (Apple/Google) verified server-side via `google-auth-library` and Apple keys

Geo:

- `LocationsService` updates user position, writes lat/lng + PostGIS `point`
- Discovery + nearby queries use `ST_DWithin` with a geohash prefilter for index speed

## Mobile (React Native 0.83)

`mobile/App.tsx` wraps the tree in `ErrorBoundary` → `GestureHandlerRootView` → Redux `Provider` → `SafeAreaProvider` → `AppNavigator`.

State:

- `@reduxjs/toolkit` per-feature slices, persisted with `redux-persist`
- `@react-navigation/native-stack` for screens, bottom tabs at the root
- `useSocket` hook centralizes Socket.IO connection lifecycle and auth handshake

Networking:

- `api/client.ts` — single axios instance with bearer interceptor + 401 retry-with-refresh
- All feature slices call through this client; no fetch sprawl

Maps:

- `react-native-maps` + `react-native-map-clustering` on the `map` screen
- Custom marker components per type (User, Event, Category)
- `mapSelectors.ts` derives the visible set; `mapSlice.ts` owns viewport state

## Data flow examples

**Send a wave** — RN dispatches `interactionsSlice.sendWave` → POST `/interactions/waves` → backend `WaveEntity` insert + Socket.IO emit to recipient room → recipient's `useSocket` hook updates Redux → notification panel re-renders.

**Discover nearby** — RN reads `mapSlice.viewport` → GET `/discovery/nearby?bbox=...` → backend filters by geohash prefix, narrows with PostGIS `ST_DWithin` against the requester's location, joins verification + presence flags → returns clustered result.

**Verify identity** — User uploads ID + selfie → presigned S3 PUT → backend triggers `face-compare.service` (AWS Rekognition `CompareFaces`) → on success writes `Verification` row, bumps user's verification badge.

## Deployment

- Backend on Render (`render.yaml`) — single web service + managed PostgreSQL + Redis
- Mobile builds via `mobile/scripts/build-release.bat` → AAB for Play Store
- Android signing keys live outside the repo; `.gitignore` covers keystores

## Open architectural questions

1. `profiles-legacy.controller.ts` is untracked inside `src/modules/users/` — either commit it under the users module or delete it.
