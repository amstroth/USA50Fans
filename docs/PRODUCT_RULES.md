# USA50 fan product rules — v0.1 handoff

## Confirmed product direction

- Free fan membership; additional paid features, including replies to Bubble-style idol messages.
- Units NYC50 (Arielle, Jaylene, Kellie, Z) and LA50 (Michelle, Zoe, Miu). These names are used in UI; generated concept images are NOT actual approved member photos.
- Digital photocards classified R, SR, SSR, MR, UR, organized by member/unit/era and eventually by themed collection.
- Only duplicate copies can be traded; each account must retain at least one copy of every unique card.
- Completing an album unlocks the right to order a physical edition of the whole set.
- After any physical set purchase (including a complimentary set), that same set cannot be reordered for 90 days. Cooldown is per set.
- Physical packs from merchandise should have unique private, one-time QR redemption codes and a separate public authenticity-verification code. The actual backend needs manufacturer-level issuance and anti-fraud controls.
- Fansites apply with original USA50 portfolio links and quality camera/lens equipment; management reviews applications. Approved fansites receive priority press access subject to venue limits and press gifts when available. Their work appears in a dedicated tab; fans vote on rankings and the top three receive year-end awards.
- Community fan content should link out to Instagram and TikTok to boost external engagement, rather than replace those platforms.
- Future livestreaming, merchandise, VIP tiers, fancalls, and livestreamed concerts are planned. Fancalls require legal review and genuine free-entry routes where random winners are used.

## Proposed pricing & mechanics (NOT finalized)

- 1 digital pull costs **300 STARS**.
- Standard-pack illustrative rarity rates: R 55%; SR 27%; SSR 12%; MR 5%; UR 1%.
- Proposed 30-pull hard pity per album; grant all remaining missing digital cards at 30 paid-style pulls. Dev build uses **test** pulls only.
- Proposed STAR packs: 300 for $2.99, 1,000 for $8.99, 3,000 for $24.99, 5,000 for $39.99, and 10,000 for $74.99. This is a target price schedule, not connected billing.
- 30 pulls require **9,000 STARS**, available as 5,000+3,000+1,000 for **$73.97** before tax, or a 10,000 pack for **$74.99** with 1,000 leftover.
- Album completion alone unlocks a purchasable physical set (illustrative $29.99). Reaching hard pity unlocks one complimentary physical set. Another proposal was a $75 album-specific qualifying spend threshold and credit for verified physical merchandise; reconciliation with IAP/platform rules and production cost is pending.
- Physical orders in v0.1 are **demo records only**. No charges, postal addresses, shipping, purchase entitlements, or third-party integration.
- VIP Points, purchased digital STARS, and Fancall Entries should be separate concepts. The first development build does not implement real versions.

## Rules specifically enforced server-side in v0.1

1. For a given card, a user with N copies may list at most N−1 copies including already reserved listings.
2. A reciprocal trade rechecks the inventory of both users before transfer; both must own at least two copies of the card they offer.
3. Photocard rarity is rolled on the server with a cryptographically strong random source, and card grants are written to one server-owned account record.
4. Exactly 30 test paid-style pulls trigger hard pity once, filling gaps in the 12-card example album.
5. The physical order-preview endpoint requires complete ownership of the twelve unique cards and enforces the 90-day cooldown after every recorded demo order.
6. One-time demo merchandise claims cannot be redeemed twice.
7. Fansite approval is restricted to management with a separate password cookie.

## Production changes mandatory

The v0.1 JSON database is single-process and adequate only for controlled tests. Replace it with PostgreSQL + transactional `SELECT FOR UPDATE` or equivalent for pulls, trades, inventory, orders, promotions, and manufacturer code redemption. Add receipts, refunds, payments, chargeback controls, content moderation with image/video reporting, anti-bot controls, email verification/recovery, age/privacy compliance, and store purchase validations. App-store rules may require reworking merchandise/QR digital-entitlement semantics.
