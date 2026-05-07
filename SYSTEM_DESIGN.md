# Hyperlocal Super-App — MVP System Design

**Scale target:** <10k DAU at launch
**Priorities:** low latency · cost efficiency · offline-first mobile · realtime updates · geo accuracy · time-to-market
**Stack:** React Native CLI (TS) · NestJS (TS) · PostgreSQL + PostGIS · Redis

---

## 1. Requirements

### Functional (MVP cut)
- Auth & profile (email/OAuth, avatar, interests, visibility radius).
- Real-time map showing nearby user avatars + POIs.
- Tap avatar → mini-profile sheet → DM / send connect / view content.
- Direct messaging (1:1 realtime chat).
- Location feed: posts + listings tied to a coordinate, filtered by radius.
- Hyperlocal commerce: create listing, browse, in-app payment (Stripe).
- Geo-notifications: enter/leave radius → push.
- Trending near me: topic ranking by recency + engagement + distance.

### Non-functional
- p95 map refresh < 500 ms; chat send < 200 ms over WS.
- Works degraded offline (cached map tiles, queued messages, optimistic UI).
- GDPR-friendly: precise location stays on device; server stores coarse cell or salted hash for non-friends.
- $ ceiling: keep monthly infra under ~$300 at <10k DAU.
- Solo / small team build → boring, managed, easy to operate.

### Explicit non-goals (for v1)
- Live video streaming, group chat at scale, full creator monetization, ML-based recommendations, multi-region.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────┐
│  React Native (iOS / Android, TS)           │
│  ┌─────────┐ ┌─────────┐ ┌──────────────┐   │
│  │ Screens │ │ Redux   │ │ MMKV / SQLite│   │
│  │ + Nav   │ │ Toolkit │ │ (offline)    │   │
│  └────┬────┘ └────┬────┘ └──────┬───────┘   │
│       │  REST     │ WS          │ Maps SDK   │
└───────┼───────────┼─────────────┼────────────┘
        │           │             │
        ▼           ▼             ▼
   ┌────────────────────────────────────┐
   │  NestJS API (single service)       │
   │  ┌──────┐ ┌──────┐ ┌────────────┐  │
   │  │ HTTP │ │ WS   │ │ BullMQ     │  │
   │  │ ctrl │ │ gw   │ │ workers    │  │
   │  └──┬───┘ └──┬───┘ └─────┬──────┘  │
   └─────┼────────┼───────────┼─────────┘
         │        │           │
   ┌─────▼────┐ ┌─▼────┐ ┌────▼────┐
   │ Postgres │ │Redis │ │ S3 /    │
   │ +PostGIS │ │ pub/ │ │ R2 blob │
   │          │ │ sub  │ │         │
   └──────────┘ └──────┘ └─────────┘
         │
   ┌─────▼─────────────────────────┐
   │ External: Stripe · FCM/APNs · │
   │ Mapbox tiles · Sentry         │
   └───────────────────────────────┘
```

**Reasoning:** at <10k DAU a modular monolith beats microservices on cost, latency, and dev velocity. Split later when a domain (chat, payments, ranking) actually needs independent scaling. Single NestJS app with feature modules keeps boundaries clean for that future split.

---

## 3. Tech Stack Decisions

| Layer | Choice | Why | What I'd revisit |
|---|---|---|---|
| Mobile | React Native CLI + TS | One codebase, native modules access for maps/BLE, team's TS strength | Expo if we later don't need custom native modules |
| Maps | `react-native-maps` (Google/Apple native) + Mapbox tiles for clustering | Native perf for 100s of avatars; Mapbox vector tiles cheaper than Google Maps SDK quotas | MapLibre if Mapbox pricing bites |
| State | Redux Toolkit + RTK Query | Predictable; RTK Query handles cache + optimistic updates | Zustand if Redux feels heavy |
| Local store | MMKV (hot KV) + SQLite via `op-sqlite` (offline queues, message cache) | MMKV faster than AsyncStorage; SQLite for relational offline data | WatermelonDB if sync grows complex |
| Realtime | NestJS WebSocket gateway + Redis pub/sub | Cheaper than dedicated realtime service for this scale | Move to Ably/Pusher or dedicated Centrifugo if connection count > 50k |
| Backend | NestJS modular monolith on Render/Fly.io | Time-to-market, batteries included, easy to split later | Break out chat + geo when traffic warrants |
| DB | Postgres 16 + PostGIS + `pg_trgm` | One DB for relational + geo + search at this scale | Add Elasticsearch when search hits limits; InfluxDB for location history if we keep it |
| Cache / queue | Redis (managed, single instance) | Pub/sub, BullMQ, hot caches in one box | Cluster when needed |
| Blob | Cloudflare R2 (S3-compatible) | Zero egress fees vs S3 | — |
| Auth | NestJS JWT + refresh tokens, Apple/Google sign-in | No vendor lock; OAuth covers majority of mobile users | Move to Clerk/Auth0 if compliance burden grows |
| Payments | Stripe Connect (Express accounts) | Standard for marketplace, handles KYC | — |
| Push | FCM (Android) + APNs direct | Free tier covers MVP | OneSignal if push UX gets complex |
| Observability | Sentry + Logtail + Postgres slow log | Cheap, sufficient for MVP | Grafana stack post-PMF |
| Hosting | Render or Fly.io for API; Neon for Postgres; Upstash for Redis | All have generous free/cheap tiers, near-zero ops | AWS when we need VPC peering, multi-region |

**Trade-off:** the original brief mentioned Kafka, Elasticsearch, K8s, Jaeger. At <10k DAU these are cost+complexity sinks. Defer until measurable pain. Document the seams now (event bus interface, search interface) so swap-in is mechanical later.

---

## 4. Data Model (core entities)

```ts
// shared/types/models.ts
export interface User {
  id: string;            // uuid
  email: string;
  authProvider: 'email' | 'google' | 'apple';
  displayName: string;
  avatarUrl?: string;
  interests: string[];
  visibility: 'public' | 'friends' | 'invisible';
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  // Coarsened cell (h3 res ~9 ≈ 150m). Precise coords stay in client; never persisted.
  h3Cell: string;
  lastSeenAt: string;
  bearing?: number;
  isLive: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  body: string;
  mediaUrls: string[];
  geom: GeoJSON.Point;       // PostGIS GEOGRAPHY(Point,4326)
  topic?: string;
  expiresAt?: string;        // ephemeral 24h posts
  createdAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  geom: GeoJSON.Point;
  status: 'active' | 'sold' | 'paused';
  stripeProductId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[]; // length 2 for v1
  lastMessageAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  clientMsgId: string;     // dedupe + offline send
  createdAt: string;
}

export interface GeoSubscription {
  id: string;
  userId: string;
  kind: 'topic' | 'listing' | 'event';
  geom: GeoJSON.Polygon | GeoJSON.Point;
  radiusM?: number;
}
```

**Postgres schema highlights**

```sql
CREATE EXTENSION postgis;
CREATE EXTENSION pg_trgm;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  interests text[] DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'public',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  media_urls text[] DEFAULT '{}',
  geom geography(Point,4326) NOT NULL,
  topic text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX posts_geom_gix ON posts USING GIST (geom);
CREATE INDEX posts_topic_trgm ON posts USING GIN (topic gin_trgm_ops);
CREATE INDEX posts_created_idx ON posts (created_at DESC);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES users(id),
  title text NOT NULL,
  description text,
  price_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  geom geography(Point,4326) NOT NULL,
  status text DEFAULT 'active',
  stripe_product_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX listings_geom_gix ON listings USING GIST (geom);
```

---

## 5. API Surface

REST for CRUD, WebSocket for fan-out (presence, chat, geo-events). Single service, versioned under `/v1`.

```
GET    /v1/me
PATCH  /v1/me
POST   /v1/auth/oauth/:provider
POST   /v1/auth/refresh

GET    /v1/map/avatars?bbox=lng1,lat1,lng2,lat2
GET    /v1/posts/nearby?lat=&lng=&radiusM=1000&limit=50
POST   /v1/posts
GET    /v1/listings/nearby?...
POST   /v1/listings
POST   /v1/listings/:id/checkout

GET    /v1/conversations
GET    /v1/conversations/:id/messages?before=
POST   /v1/conversations/:id/messages

POST   /v1/geo/subscriptions
DELETE /v1/geo/subscriptions/:id

GET    /v1/trending/nearby?lat=&lng=&radiusM=
```

**WebSocket channels** (Socket.IO for browser/RN parity):
- `presence:bbox` — client sends viewport bbox; server streams enter/leave/move events for avatars in view.
- `chat:user:{userId}` — incoming messages.
- `geo:events:{userId}` — geofence enter/leave + topic alerts.

---

## 6. Frontend Architecture (React Native + TS)

### Folder layout

```
src/
  app/
    App.tsx
    navigation/
      RootNavigator.tsx
      AuthStack.tsx
      MainTabs.tsx
  features/
    auth/             # screens, slice, api
    profile/
    map/              # MapScreen, useNearbyAvatars hook
    chat/             # convo list + thread, ws client
    feed/
    listings/
    notifications/
  shared/
    api/              # RTK Query base
    ws/               # singleton socket client
    geo/              # h3, distance utils
    components/
    hooks/
    storage/          # mmkv + sqlite wrappers
    types/
  theme/
  config/
```

### App.tsx (skeleton)

```tsx
// src/app/App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './store';
import { RootNavigator } from './navigation/RootNavigator';
import { WSProvider } from '@/shared/ws/WSProvider';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <WSProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </WSProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
```

### Navigation

```tsx
// src/app/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '@/app/hooks';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const isAuthed = useAppSelector(s => !!s.auth.accessToken);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthed
        ? <Stack.Screen name="Main" component={MainTabs} />
        : <Stack.Screen name="Auth" component={AuthStack} />}
    </Stack.Navigator>
  );
}
```

### Auth slice (minimal)

```ts
// @ts-nocheck
// src/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storage } from '@/shared/storage/mmkv';

interface AuthState { accessToken?: string; refreshToken?: string; userId?: string; }

const initial: AuthState = {
  accessToken: storage.getString('access') ?? undefined,
  refreshToken: storage.getString('refresh') ?? undefined,
  userId: storage.getString('uid') ?? undefined,
};

const slice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    setSession(state, a: PayloadAction<AuthState>) {
      Object.assign(state, a.payload);
      storage.set('access', a.payload.accessToken ?? '');
      storage.set('refresh', a.payload.refreshToken ?? '');
      storage.set('uid', a.payload.userId ?? '');
    },
    signOut(state) {
      state.accessToken = state.refreshToken = state.userId = undefined;
      storage.delete('access'); storage.delete('refresh'); storage.delete('uid');
    },
  },
});
export const { setSession, signOut } = slice.actions;
export default slice.reducer;
```

### Map screen with avatars

```tsx
// src/features/map/MapScreen.tsx
import React, { useEffect, useState } from 'react';
import MapView, { Marker, Region } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { useNearbyAvatars } from './useNearbyAvatars';
import { Avatar } from '@/shared/components/Avatar';

export function MapScreen({ navigation }: any) {
  const [region, setRegion] = useState<Region | undefined>();
  const { avatars } = useNearbyAvatars(region);

  return (
    <View style={styles.fill}>
      <MapView
        style={styles.fill}
        showsUserLocation
        onRegionChangeComplete={setRegion}
      >
        {avatars.map(a => (
          <Marker
            key={a.userId}
            coordinate={a.coord}
            onPress={() => navigation.navigate('MiniProfile', { userId: a.userId })}
          >
            <Avatar uri={a.avatarUrl} size={36} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
const styles = StyleSheet.create({ fill: { flex: 1 } });
```

```ts
// src/features/map/useNearbyAvatars.ts
import { useEffect, useState } from 'react';
import { Region } from 'react-native-maps';
import { ws } from '@/shared/ws/socket';

interface AvatarPin { userId: string; coord: { latitude: number; longitude: number }; avatarUrl?: string; }

export function useNearbyAvatars(region?: Region) {
  const [avatars, setAvatars] = useState<AvatarPin[]>([]);

  useEffect(() => {
    if (!region) return;
    const bbox = bboxFromRegion(region);
    ws.emit('presence:subscribe', bbox);
    const onUpsert = (p: AvatarPin) => setAvatars(prev => upsertById(prev, p));
    const onLeave  = (id: string) => setAvatars(prev => prev.filter(x => x.userId !== id));
    ws.on('presence:upsert', onUpsert);
    ws.on('presence:leave',  onLeave);
    return () => { ws.off('presence:upsert', onUpsert); ws.off('presence:leave', onLeave); };
  }, [region?.latitude, region?.longitude, region?.latitudeDelta, region?.longitudeDelta]);

  return { avatars };
}
```

---

## 7. Realtime Layer

**Decision:** WebSocket (Socket.IO) with viewport-scoped subscriptions, fan-out via Redis pub/sub. Polling fails latency goal; raw WS works but Socket.IO gives free reconnection, room model, fallback.

**Flow for presence:**
1. Client periodically POSTs coarsened H3 cell (`POST /v1/me/presence`) every 15s while app foreground.
2. Server stores in Redis `presence:cell:{h3} → SET<userId>` with TTL 60s.
3. Server publishes `presence.upsert` on a Redis channel keyed by H3 cell.
4. WS gateway: each client subscribes to the H3 cells covering its viewport bbox. Backend maps bbox → cells, joins/leaves Redis pub/sub rooms.

**NestJS gateway snippet**

```ts
// src/realtime/presence.gateway.ts
@WebSocketGateway({ cors: true })
export class PresenceGateway {
  constructor(private readonly redis: RedisService) {}

  @SubscribeMessage('presence:subscribe')
  async onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() bbox: BBox) {
    const cells = h3.polygonToCells(bboxToPolygon(bbox), 8);
    client.data.cells = cells;
    cells.forEach(c => client.join(`cell:${c}`));
    // bootstrap snapshot
    const users = await this.redis.smembersAcross(cells.map(c => `presence:cell:${c}`));
    client.emit('presence:snapshot', users);
  }
}
```

**Why H3 cells, not GIST queries on every tick:** GIST is fine for a one-shot query, but presence churns. Cell-keyed pub/sub turns viewport sub into O(cells) channel joins instead of O(users) DB scans.

---

## 8. Geo & Location Handling

- **Client:** `react-native-geolocation-service` for high-accuracy when on map screen; coarse mode otherwise to save battery.
- **Coarsening:** before sending presence, snap to H3 res 9 (~150 m) unless user is in `ghost` mode (then suppress entirely).
- **Server:** PostGIS `geography(Point,4326)` with GIST index for posts/listings; H3 cell IDs for presence (in Redis only).
- **Background tracking:** off by default. Opt-in only for geofence subscriptions; uses platform geofence APIs (`react-native-background-geolocation`) so OS wakes us — no continuous tracking.

---

## 9. Offline-First Strategy

| Concern | Strategy |
|---|---|
| Map tiles | Mapbox SDK offline regions: pre-download last viewed area. |
| Feed / listings | RTK Query with persisted cache (mmkv-redux-persist), 5-min TTL; show cached on cold start. |
| Outgoing messages | Write to SQLite outbox with `clientMsgId`; background task drains via WS or REST fallback; server idempotency on `clientMsgId`. |
| Presence | Skip when offline; on resume, send single batch update. |
| Conflict resolution | Last-writer-wins on profile edits; server timestamps authoritative. |

```ts
// src/features/chat/outbox.ts
export async function enqueueMessage(m: PendingMessage) {
  await sqlite.execute(
    'INSERT OR IGNORE INTO outbox(client_msg_id, convo_id, body, created_at) VALUES (?,?,?,?)',
    [m.clientMsgId, m.conversationId, m.body, Date.now()]
  );
  drainOutbox().catch(() => {/* will retry on connectivity */});
}
```

---

## 10. Privacy & Auth

- **Auth:** Apple/Google sign-in primary, email/password fallback. JWT access (15m) + refresh (30d, rotated).
- **Visibility tiers:** public / friends / invisible. Server filters presence pushes by `viewer ∈ allowed_for(target)`.
- **Location minimization:**
  - Precise coords never persisted server-side.
  - Presence stored only in Redis with TTL.
  - For DMs/listings, store the H3 cell and a salted hash of precise coord (per-user salt) for dispute resolution; rotate salt yearly.
- **Right-to-delete:** soft-delete user → cascade hard-delete after 30d via BullMQ job; Stripe records retained per legal.

---

## 11. Payments (Listings)

**Stripe Connect Express:** sellers onboard; buyers checkout via PaymentIntent; platform takes app fee. Custody outside Stripe is out of scope.

```ts
// backend: src/listings/listings.controller.ts
@Post(':id/checkout')
@UseGuards(JwtGuard)
async checkout(@Param('id') id: string, @CurrentUser() me: User) {
  const listing = await this.listings.requireActive(id);
  const intent = await this.stripe.paymentIntents.create({
    amount: listing.priceCents,
    currency: listing.currency,
    application_fee_amount: Math.round(listing.priceCents * 0.05),
    transfer_data: { destination: listing.seller.stripeAccountId! },
    metadata: { listingId: id, buyerId: me.id },
  });
  return { clientSecret: intent.client_secret };
}
```

```tsx
// mobile: src/features/listings/CheckoutButton.tsx
import { useStripe } from '@stripe/stripe-react-native';
export function CheckoutButton({ listingId }: { listingId: string }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const onPay = async () => {
    const { clientSecret } = await api.checkout(listingId);
    await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'Hyperlocal' });
    const { error } = await presentPaymentSheet();
    if (!error) toast('Payment complete');
  };
  return <Button title="Buy" onPress={onPay} />;
}
```

Webhook (`POST /v1/stripe/webhook`) flips listing → `sold`, opens convo between buyer/seller.

---

## 12. Geo-Notifications

**Two delivery paths:**
1. **Foreground:** WS `geo:events:{userId}` stream while app open.
2. **Background:** server runs a BullMQ job whenever a relevant entity (post/listing/event) is created → query active `geo_subscriptions` with `ST_DWithin(geom, $point, radius)` → push via FCM/APNs.

Subscription model: user creates a polygon or radius; server stores in `geo_subscriptions` with GIST index. No continuous server-side tracking required — geofence eval happens at *publish time*, not on every position update.

```ts
// backend: src/posts/posts.service.ts (after insert)
await this.queue.add('fanout-post', { postId: p.id });
// worker:
@Process('fanout-post')
async fanout({ data }: Job<{postId: string}>) {
  const subs = await this.db.query<GeoSub>(`
    SELECT s.* FROM geo_subscriptions s
    JOIN posts p ON p.id = $1
    WHERE ST_DWithin(s.geom, p.geom, COALESCE(s.radius_m, 0))
  `, [data.postId]);
  await this.push.sendBatch(subs.map(s => ({ userId: s.userId, payload: {/*...*/} })));
}
```

---

## 13. Trending Topics

Compute server-side, refreshed every 60s into Redis ZSETs keyed by H3 cell + parent cells (rollup).

Score = `engagement * recencyDecay * inverseDistance`.

```sql
-- pseudo, run as scheduled query into materialized view
SELECT
  topic,
  h3_cell,
  SUM( (likes + 2*comments) * exp(-EXTRACT(EPOCH FROM now() - created_at)/3600/6) ) AS score
FROM posts
WHERE created_at > now() - interval '24 hours' AND topic IS NOT NULL
GROUP BY topic, h3_cell;
```

API: `GET /v1/trending/nearby?lat&lng&radiusM` → server resolves to cell set, unions ZSETs from Redis, returns top N.

UI surface: bottom sheet on map "Trending near you" with topic chips → tap → filtered feed.

---

## 14. Scale & Reliability (sized for 10k DAU, headroom to 50k)

| Concern | Plan |
|---|---|
| Concurrent WS | ~1500 peak. Single Node + Socket.IO handles 5–10k easily; sticky sessions via Render's SSL terminator. |
| DB | Neon Postgres serverless, autoscale; one read replica when reads dominate. |
| Redis | Upstash 256 MB plan; pub/sub + caches + queues. |
| Storage | R2 with signed-URL uploads from client. |
| Deploys | GitHub Actions → Render auto-deploy; preview env per PR. |
| Backups | Neon PITR (default 7d). Nightly pg_dump to R2 for paranoia. |
| Failover | Single-region (us-east-1) at MVP. Document the RPO/RTO and accept it. |
| Monitoring | Sentry (errors), Logtail (logs), `/healthz` endpoint, uptime ping (BetterStack). Alert on: 5xx >2%/5m, WS disconnect storms, queue backlog, p95 latency. |

---

## 15. Trade-offs / What I'd Revisit

- **Modular monolith** → split chat + geo when WS connections >50k or DB CPU >70%.
- **Postgres-as-search** → bring in Meilisearch/Elasticsearch when full-text on listings hurts.
- **Socket.IO** → migrate to native WS or Centrifugo if message volume forces it.
- **Custom auth** → consider Clerk if SOC2 / enterprise-style controls become needed.
- **Single region** → multi-region read replicas when international traction appears; full active-active is rarely worth it.

---

## 16. Phased Roadmap

### Phase 0 — Week 0 (foundation, ~3 days)
RN scaffold, NestJS scaffold, CI/CD, auth (email + Apple/Google), profile CRUD, map screen showing self only.

### Phase 1 — Weeks 1–3 (real-time core)
Presence pipeline (H3 + Redis), nearby avatars on map, mini-profile sheet, 1:1 chat over WS with offline outbox.

### Phase 2 — Weeks 4–6 (content + commerce)
Posts (geo feed), listings CRUD, Stripe Connect onboarding + checkout, media uploads to R2.

### Phase 3 — Weeks 7–8 (hyperlocal)
Geo-subscriptions, push notifications via FCM/APNs, trending topics, basic moderation tooling.

### Phase 4 — Week 9 (polish + beta)
Offline regions, deep links, profile completion nudges, App Store / Play Store submission, closed beta with city-scoped invite.

### Phase 5 — Post-launch
Measure: D1/D7 retention, message-per-user, listing GMV, push CTR. Then prioritize: groups, events, live, recommendations.

---

## 17. Open Questions for You

1. Single launch city, or wide geo spread? Affects density assumptions and trending math.
2. Are listings P2P only, or do we want merchants/SMBs from day one? Changes onboarding KYC complexity.
3. Hard requirement on "live streaming" in MVP? If yes, this stack adds Mux/LiveKit and another ~2 weeks.
4. iOS-first or both stores at launch? Affects the Apple Sign-In dependency timing.
5. Any compliance constraints I should bake in now (CCPA, COPPA, EU)?
