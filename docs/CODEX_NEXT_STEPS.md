# Paste this into Codex

Read `README.md`, `docs/PRODUCT_RULES.md`, `server.js`, `www/app.js`, `www/styles.css`, `railway.json`, `capacitor.config.json`, and `tests/smoke.mjs` before making changes. This is the **working USA50 Railway-first development build**, intentionally built with vanilla HTML/CSS/JavaScript + Node.js to mirror the FiftyHQ workflow. React is not required, and we plan to package the web app later with Capacitor for real iOS/Android apps.

First run `npm run check` and `npm test`. Preserve the existing implemented demo functionality and the approved holographic USA50 styling. Then improve v0.2 in this order:

1. Add role-based admin identities (not shared-password-only) and convert the JSON store into PostgreSQL with migrations and transactional trading/pulls.
2. Create real collections by member, unit, and release; an admin content manager for images, packs, rarity odds, and editions. The current Arielle True Love album is a 12-card example.
3. Add a separate formal product specification for free digital packs, paid gacha packs, and the physical pity/spending reward; do not turn simulated STAR refills into paid purchases without app-store and legal review.
4. Build one-time physical-pack QR code issuance/redemption with hashed tokens, ownership proof, merchant verification, manufacturer fulfillment, and redemption auditing. Check Apple/Google guidelines before enabling digital card awards from external physical purchases.
5. Improve card-to-photo composition for approved photography, upload/storage, metadata and consistent overlays. Confirm actual media rights before public launch.
6. Implement user-photo media moderation, fansite portfolios/gallery review, event-specific press ticket inventory, and abuse-resistant yearly voting.
7. Add production billing and shop/fulfillment only after app-store IAP, physical-goods checkout, account deletion, and age/privacy policies are resolved.
8. Set `www/config.js` `apiBase` to Railway HTTPS API, integrate secure native auth storage, camera and push plugins, run native tests using Capacitor; ensure Apple review gets more than a web-page wrapper.

For each feature, write a small test, deploy after passing the test, and update this documentation. Avoid marketing copy claiming functionality is real until wired to real services. Do not include credentials or secrets in source control.
