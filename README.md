# G88 — Total MVP

A location-based social platform: discover people and events on a map, chat in real time, trade items locally, attend events, and build reputation.

## Repo layout

```
totalmvp/
├── backend/            NestJS + TypeORM + PostgreSQL/PostGIS + Redis + Socket.IO
│   ├── src/
│   │   ├── modules/    auth, users, profiles, discovery, chat, events,
│   │   │               locations, gifts, gamification, trading, social,
│   │   │               interactions, notifications, payments, verification,
│   │   │               analytics, admin
│   │   ├── common/     shared services (cache, email, S3, Redis, Twilio, face compare)
│   │   ├── config/     database + TypeORM config
│   │   ├── migrations/ TypeORM migrations
│   │   └── seeds/      DB seed scripts
│   └── deploy/         Docker + Render deployment
├── mobile/             React Native 0.83 + Redux Toolkit + RN Navigation
│   └── src/
│       ├── api/        axios client
│       ├── features/   one folder per domain (auth, map, discovery, chat, events,
│       │               profile, trading, market, gamification, gifts, verification,
│       │               notifications, payments, settings, inbox, trending, interactions)
│       ├── components/ cross-cutting UI (ActionHub, ErrorBoundary, …)
│       ├── navigation/ AppNavigator (root)
│       ├── store/      Redux store + persist
│       ├── hooks/      typed redux + useSocket
│       └── utils/      eventBus
├── docs/               PRIVACY_POLICY, DATA_SAFETY_DECLARATION, PLAY_STORE_CHECKLIST
├── PRODUCT.md          product idea + fundamentals (start here)
├── ARCHITECTURE.md     system overview + data flow
└── render.yaml         Render web-service config
```

## Quick start

Backend:

```bash
cd backend
npm install
cp .env.example .env       # fill values
npm run migration:run
npm run start:dev          # http://localhost:3000/api/v1
```

Mobile:

```bash
cd mobile
npm install
cp .env.example .env       # fill API_URL + Maps key
npm run android            # or: npm run ios
```

## Status

The MVP covers all 17 backend modules and matching mobile features. See `PRODUCT.md` for the product fundamentals and `ARCHITECTURE.md` for how the pieces fit together. Tech debt and prioritized refactor plan: `TECH_DEBT_AUDIT.md`.
