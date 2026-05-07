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