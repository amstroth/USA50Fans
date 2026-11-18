# USA50 Fan Club — React Migration

The primary web interface now uses React 19 and Vite 8. The existing Node 22 API and Railway persistent data store are unchanged: no accounts, cards, rank, STAR balances, or fancall entries were moved or reset.

## URLs

- React: /react/
- Default site: / redirects to /react/
- Classic working app: /index.html
- Original home fallback: /?classic=1
- Existing API: /api/*, unchanged

## React architecture

- frontend/src/main.jsx: React navigation, responsive shell, mail inbox
- frontend/src/state.jsx and api.js: authenticated app state, API operations, routing and notifications
- frontend/src/ui.jsx: reusable icons, verified badges, avatars, stars and photocards with studio-authored face text overlays
- frontend/src/core-pages.jsx: Home, Collection, inventory and STAR Shop
- frontend/src/social.jsx: social posts, hashtags, creator composer, idol hearts, voting and bookmarks
- frontend/src/profile.jsx: sign-in, account profile editing, Oshi selection, idol Oshi count and ranks
- frontend/src/events.jsx: event admission links, free fancall lotteries, management forms and React waiting-room launcher
- frontend/src/rankings.jsx: native ranked top-three podium and searchable top-100 leaderboard; rank badges open this route
- frontend/src/live.jsx: native livestream playback, moderated chat, demo STAR gifts, TTS approval, OBS settings, creator ledger and broadcaster status
- frontend/src/calls.jsx: native React WebRTC camera/microphone, active winner slot gating, idol queue, management observer and call controls
- frontend/src/app.css: responsive styling
- frontend/index.html: HTML entrypoint
- vite.config.mjs: builds into www/react/

## Compatibility screens

Card Drops (including animated reveal and advanced 3D card viewer), Messages, Idol Studio, Fansites, duplicate recycling and management still use the classic implementations, embedded inside the React layout. Native React now handles the public livestream player, chat, demo STAR gifts, OBS controls, fan rankings and WebRTC fancall room. The advanced classic creator/live tools remain accessible separately as a fallback. The compatibility bridge is in www/react-bridge.js and www/react-bridge.css.

This is a real, staged React migration, NOT a claim that all previous vanilla JavaScript has already been rewritten. The classic version at /index.html must remain accessible until complete feature parity is tested.

The special embedded classic page uses a same-origin iframe. Only /index.html with embed=1 receives SAMEORIGIN/X-Frame-Options and frame-ancestors self; unembedded pages still block framing.

## Development

Run the backend in one terminal:

    npm install
    npm run dev

Run the React Vite development server in a second terminal:

    npm run dev:react

Produce React static files:

    npm run build:react

The React dev server proxies API/assets to localhost:3000. Routing uses hashes such as /react/#/community so the Node server needs no SPA history fallback.

## Railway

The multi-stage Dockerfile runs a React build in its builder image, copies built files into www/react, and runs the existing backend and tests in the runtime image. The existing Railway DATA_DIR volume is untouched. Backend role checks remain authoritative. No OBS stream keys or live video move into the browser application.

## Next migrations

1. Full-screen Card Drops animations, pack roll history and 3D collectible viewer.
2. Fan Messages and Idol Studio; retain subscriber/role logic.
3. Complete production readiness for React live chat/OBS/WebRTC with TURN, managed video ingest and multi-device testing. Migrate remaining optional classic tools.
4. Diary drag/drop canvas, Fansites, duplicate recycle and management screens.
5. End-to-end tests across fan, idol and management roles; mobile/PWA performance and accessibility. Remove the iframe only after those checks pass.

## QA checklist

- Fan/idol/staff login, session continuity and logout.
- Idol-only heart awards exactly 150 XP per unique heart; mailbox notification.
- Fan Oshi multi-select edit; idol Oshi count and verified stars.
- Photocard inventory and ticket quantities survive switching to Card Drops.
- Free entry for fancall lotteries, assigned idol permissions and WebRTC host handoff. The new session-status endpoint must reject unrelated accounts.
- React photocard face text preserves Studio metadata including 660x1020 positions, fonts, color, weight and italic.
- Rank badge taps on Social and profiles open the React ranking board; leaderboard rows open fans' profiles.
- Admission links are external; no simulated checkout is misrepresented as payment.
- iOS/Android viewports, modal interactions, 3D canvas and camera permissions.
- Back navigation from embedded classic screens returns to React correctly.

See LIVE_MEDIA_SETUP.md for streaming infrastructure deployment requirements.
