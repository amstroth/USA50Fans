# USA50 Card Studio — Management Guide

Card Studio is a separate, desktop-only admin workspace:

- **URL:** `/studio.html`
- **Access:** Sign in with a USA50 management account (`role=admin`) and complete the first-login password change. A public fan account, idol account, or the legacy dashboard PIN alone cannot edit Card Studio.
- **Desktop layout:** Minimum viewport width 1024px. The server enforces role permissions independently of viewport width.

## Create or edit a pack

1. Open **Management → Card Studio** on a desktop, or browse to `/studio.html`.
2. Choose an existing collection in the left sidebar or click **+** to create one.
3. Enter pack name, member/group, team, subgroup, description and optional release date.
4. Add cards. Each card has its own **name**, **rarity** (R, SR, SSR, MR, UR) and **border** (matching rarity preset or **None** for a fully custom card).
5. Select **Upload, crop & resize artwork**. Drag to reposition, use the zoom slider or rotate; click **Apply cropped artwork**. Images are cropped in the browser, and the server checks the exported dimensions and file type.
6. Click **Save pack** in the right-hand panel.

### Face standard

- Physical trim: **55 × 85 mm**, portrait aspect ratio **11:17**
- Working crop and exported master: **660 × 1020 pixels**
- Supported imports: JPEG, PNG and WebP. Crop export: WebP (PNG fallback).
- Uploads are stored separately from the card rarity border. Choosing **No border** allows the complete custom face to appear without a preset overlay.
- A separate bleed/safe-zone workflow and print-vendor validation will be required before manufacturing physical cards.

## Publishing states

| State | Visible to fans? | Pulls enabled? | What happens at the release date? |
| --- | --- | --- | --- |
| **Draft** | No | No | **Nothing**; never auto-publishes |
| **Scheduled** | Listed as coming soon | No until release | Becomes available at/after the configured UTC date when a fan requests the catalogue |
| **Published** | Yes | Yes | Available immediately regardless of a future date |
| **Preview** | Existing placeholder state | No | Remains a preview until management explicitly changes its status |

A pack can only be scheduled or published when it contains at least one card and all cards have approved artwork, rarity, and border settings. The original True Love pack also must keep at least one of each rarity because its existing 55/27/12/5/1 weighted draw depends on those rarities.

The system recalculates availability on each API request; it does not depend on an always-running cron job. Users may need to refresh the page once a scheduled release begins.

## Test packs and deletion

New collections default to **Test pack**, and management can permanently delete them after typing **DELETE** in the confirmation prompt. Test deletion removes the pack, related demonstration inventories/trade listings, and unreferenced uploaded artwork. Official packs cannot be deleted through this endpoint: use Draft to remove them from circulation.

This is a **development environment**: no real currency purchases, prints, or live fancall entries are performed by the app.

## Technical implementation

- `card-studio.js`: management-only API, metadata validation, pack lifecycle, artwork storage and public catalogue
- `www/studio.html`, `www/studio.js`, `www/studio.css`: desktop-only editor and browser crop canvas
- `www/studio-link.js`: management dashboard launcher
- `www/pack-selector-v07.js`: published pack selection and API pull routing
- `www/collection-studio-v08.js`: collection galleries for newly released sets
- `tests/card-studio.mjs`: role checks, draft protection, scheduling, image dimensions, custom pulls and delete tests

Images and pack records are currently backed by the same persistent Railway volume used by the v0.1 prototype. Move pack metadata and fan inventory to a transactional database and move art files to durable object storage before opening real purchases or collector fulfillment. Production launch should also add asset moderation, audit review, access logging, and comprehensive print-bleed templates.
