# USA50 Fan Club — Railway Development Build v0.1.0

**A working web-first USA50 prototype built like FiftyHQ: standard HTML, CSS, JavaScript, and a Node.js server. React is not required.** The project is organized for Railway deployment and eventual Capacitor packaging into genuine Android/iOS projects.

> **DEVELOPMENT PREVIEW — NOT A PRODUCTION FAN APP.** All STARS are free test credits. Purchases, physical orders, ticketing, gifting, and subscriptions are simulated or disabled. Photographic art is an AI concept placeholder and must be replaced with official licensed USA50 imagery before launch. The current JSON store is for development, not scale.

## Run locally (Windows PowerShell)

1. Extract this entire ZIP to a new folder, e.g. `E:\USA50_Fan_Club_Railway_v1`.
2. Install **Node.js 22 or newer**.
3. Open that folder in VS Code; open Terminal and run:

```powershell
npm start
```

4. Visit **http://localhost:3000** on your computer.
5. Create a free demo fan account in **My Page**. Each account begins with 9,000 free demo STARS and a few starter cards.

**No `npm install` and no Expo login are required to run the Railway web version.** It uses only built-in Node.js dependencies.

Optional development checks:

```powershell
npm run check
npm test
```

## Deploy to Railway (same basic flow as FiftyHQ)

1. Create a new GitHub repository such as `usa50-fan-club` and commit **the contents of this project folder** (not the surrounding ZIP).
2. In Railway, **New Project → Deploy from GitHub repo**, select the repository.
3. Railway detects the included Dockerfile and runs `npm start`. `/api/health` is the health endpoint.
4. Add a **Railway Volume** to this service with mount path `/data` and set variables:

| Variable | Value | Required? |
|---|---|---|
| `DATA_DIR` | `/data` | Yes for persistent development data |
| `SESSION_SECRET` | 32+ random bytes, hex encoded | Yes; must remain stable across redeploys |
| `ADMIN_PASSWORD` | A long private password set by management | Yes to enable management dashboard |
| `NODE_ENV` | `production` | Recommended |
| `PORT` | Railway provides this automatically | Do not hardcode |
| `ALLOWED_ORIGINS` | Exact additional frontend origins, comma-separated | Only if needed for separate native/API origins |

Generate a secure random `SESSION_SECRET` locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Never paste your admin password or session secret into a tracked GitHub file.** Put them in Railway Variables only. If `DATA_DIR=/data` is missing, data in the deployed container may be lost on restart/redeploy. The JSON store is a **single-process development mechanism**, not a replacement for PostgreSQL. Back up your volume regularly, and migrate to PostgreSQL before public release.

5. Deploy, add a Railway public domain, then test `https://YOUR-DOMAIN/api/health`.
6. Open the web app in your phone's browser. It uses a responsive mobile layout.

The GitHub/Railway upload steps have **not** been performed by ChatGPT; this package is the deployable project source, not a live URL.

## Working development features

| Area | What works now |
|---|---|
| Fan accounts | Register, log in, log out, signed sessions, personal collection state |
| Home | Unit cards, member navigation, admin-published news |
| Collection | Twelve-card Arielle / True Love concept album, rarity filters, collection percentage, locked/owned cards |
| Card Drops | Server-side randomized 1-card draws, proposed R/SR/SSR/MR/UR odds, 300 demo STARS per pull |
| Pity | At paid-style demo pull 30, automatically grant every missing album card, and grant a free physical-set **preview** |
| Trading | List only spare duplicates, protect last copy, trade duplicate for duplicate, cancel listing; server-side checks |
| Physical sets | Preview ordering only after completion; 90-day lock enforced after each demo order |
| Physical insert | One-time per-account **demo** redemption code, manual input and BarcodeDetector scanning where supported |
| Community | Text posts, Instagram/TikTok outbound links, likes, reports, management removal |
| Fansites | Apply with camera/lenses, portfolio, description; admin approve/reject; rankings, one fan vote per account |
| Messages | Read-only demonstration member channels; replies locked for free fans, UI preview mode for subscribers |
| Shop / Events | Responsive sample catalogs; no real checkout or tickets |
| Management | Password-gated web admin for announcements, fansites, and reported posts |

## Not implemented or production-ready yet

Real STARS purchases, Stripe/Shopify checkout, RevenueCat/App Store/Play billing, stock/inventory, shipment tracking, QR codes registered with a manufacturer, real merchandise-to-digital entitlements, image uploading, external Instagram/TikTok APIs, staff/moderator accounts with granular roles, fansite media galleries, push notifications, real idol chat delivery, livestreaming, fancalls, fan voting anti-fraud, and native APK/IPA builds. The approved visual references should guide the rest of the implementation.

**Important policy work:** Before making paid randomized digital cards available, publish verified odds and obtain a legal/app-store assessment of gifting, digital currency, pity, and physical-item entitlements. Any fancall chance-based entry must have official rules and a legally compliant genuinely free entry route.

## Capacitor — later convert this same web app to native (no React required)

This project includes `capacitor.config.json` and a ready-made `www/` web app. On your Windows development machine, after web flows are stable:

```powershell
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```

Use Android Studio to test and build the app. For iOS you additionally need macOS/Xcode (or a compatible cloud build service):

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

**Before packaging:**

- Replace `com.usa50.fanclub` with an app ID controlled by USA50.
- Change `www/config.js` `apiBase` from empty to the **HTTPS Railway backend domain**, because requests cannot point at the mobile app's local origin after bundling.
- Implement secure token storage/native authentication and native QR/push integrations; the prototype uses browser-local token storage for convenience.
- Audit in-app billing, community safety, permissions, privacy, account deletion, and Apple App Review Guideline 4.2. A simple web wrapper alone is not guaranteed App Store approval.
- Move shared state to PostgreSQL with proper transactions before substantial fan traffic.

### Folder guide

- `server.js` — API, login, demo card economy, trades, fansites, moderation, physical previews.
- `www/index.html`, `www/styles.css`, `www/app.js` — mobile-first USA50 UI.
- `www/assets/frames/` — smaller versions of the approved rarity frames.
- `www/config.js` — optional native API base URL.
- `www/manifest.webmanifest` — mobile-web install metadata.
- `railway.json`, `Dockerfile` — Railway deployment.
- `capacitor.config.json` — future native packaging configuration.
- `tests/smoke.mjs` — executable API smoke tests.
- `docs/` — product rules, handoff notes, next work.

## Next Codex instruction

See [`docs/CODEX_NEXT_STEPS.md`](docs/CODEX_NEXT_STEPS.md). Preserve the current Node/Railway source and improve this foundation rather than starting a second blank app.
## GitHub deployment status (2026-11-12)

- Source has been imported to this repo as editable JavaScript/CSS/HTML, with optimized preview art in `www/assets`.
- The `Expand and test USA50 sources` GitHub Action passed all 10 smoke tests.
- `Dockerfile` copies the editable `server.js` and `www/` source files and starts the app using Node 22. The `source_payload.b64` file is retained only as a recoverable source snapshot.
- A **Railway service has not yet been created**. Connect this repo to Railway in your Railway workspace and configure a persistent volume/variables before inviting testers.
- The optimized preview assets are placeholders, not official member photos or final-resolution print assets.

