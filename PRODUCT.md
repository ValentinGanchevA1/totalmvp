# G88 — Product fundamentals

## One-liner

A map-first social app: see who and what is nearby, then act on it — chat, meet, trade, attend.

## Why it exists

Existing social apps either show you a feed of people you can't reach (Instagram) or a static list of swipes (Tinder) or events without people (Meetup). G88 puts real, verified people and live events on a shared map and gives them lightweight ways to interact in the physical world.

## Core jobs to be done

1. **See what's around me right now** — people, events, listings, all on one map.
2. **Reach out without commitment** — waves, gifts, and short interactions before any deeper conversation.
3. **Decide who's real** — verification (email, phone, photo, ID, social linking) so the map isn't a bot farm.
4. **Trade and transact locally** — listings + offers for nearby items.
5. **Build reputation** — gamification (achievements, challenges, leaderboard) rewards repeat positive behavior.

## Primary user flows

| Flow | Surface |
|---|---|
| Sign up + verify | `auth`, `verification` |
| Build profile (photos, interests, goals, location) | `profile` (multi-step) |
| Discover on map (filter by category, distance, event) | `map`, `discovery` |
| Wave / like / chat | `interactions`, `chat` |
| Create or join event (with polls, Q&A) | `events` |
| Send gift | `gifts` |
| Post listing / make offer | `trading`, `market` |
| Earn achievement / climb leaderboard | `gamification` |

## Entities (high level)

- **User** — auth identity, profile, photos, interests, goals, location, verification state, wallet balance, achievements
- **Match / Swipe** — discovery interactions
- **Conversation / Message** — chat (REST + Socket.IO)
- **Event** — geo-anchored event with attendees, polls, questions
- **Wave** — lightweight outreach (the "low-cost" interaction)
- **Gift / Wallet / GiftTransaction** — virtual goods + economy
- **TradeListing / TradeOffer / TradeFavorite** — local marketplace
- **Achievement / Challenge / UserAchievement / UserChallenge** — gamification
- **Geofence / Notification** — push when something happens nearby
- **AdminUser / AuditLog** — moderation

## Tech foundations

- **Geo**: PostGIS + ngeohash for nearby queries
- **Realtime**: Socket.IO (chat + events) backed by Redis adapter
- **Auth**: JWT + Passport + Apple/Google/Facebook social, with phone OTP via Twilio
- **Identity verification**: AWS Rekognition (face compare) + ID document checks
- **Payments**: Stripe (web + RN SDK)
- **Storage**: S3 with presigned URLs
- **Notifications**: Firebase Cloud Messaging (RN), SendGrid (email)
- **Rate limiting**: NestJS Throttler, multi-tier (1s / 10s / 60s windows)

## Out of scope for MVP

- Web client (mobile-first only)
- Group chat (1:1 only)
- International payments / multi-currency
- Live video / streaming
- Algorithmic ranking beyond "nearby + trending"

## Success metrics

Keep early. The minimal set:

1. **D1/D7/D30 retention** — does the map stay sticky?
2. **% verified users** — proxy for trust
3. **Wave-to-chat conversion** — does the lightweight outreach actually start conversations?
4. **Events with ≥3 attendees** — supply-side health
5. **Listings with ≥1 offer** — marketplace liquidity
