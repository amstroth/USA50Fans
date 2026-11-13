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

## Border Library (v0.9)

From the desktop Card Studio sidebar choose **✦ Border Library**. Select an existing custom preset to rename it or replace its artwork, or choose **Create custom border** to add another preset.

1. Supply a name and optional suggested rarity (R/SR/SSR/MR/UR). The selected rarity is a recommendation only: borders can be applied independently of the card's actual gacha rarity.
2. Select **Upload transparent border**, then choose a **transparent PNG or WebP** with space for the card photo in the center.
3. Drag to position, zoom, or rotate the border in the preview. Cropping/export retains transparency, outputting exactly **660 × 1020 px**.
4. Click **Apply cropped artwork**, then **Save border preset**.
5. Return to **Collections**, choose a card, and select the custom border under **Face border**. You can also choose **No border — fully custom face**.

Custom border presets can be deleted only after no cards (including draft packs) reference them. The five original built-in rarity borders are protected from deletion so existing collections cannot be broken accidentally.

### Upload troubleshooting
- If the file selection dialog appears but the crop preview does not, refresh the page with Ctrl+Shift+R. The image preview relies on the browser's `blob:` image URL, which is explicitly permitted by the latest Content Security Policy.
- Artwork can be JPEG, PNG or WebP. Border overlays should use transparent PNG/WebP, not JPEG.
- Maximum processed file size is **5 MB**; imports up to 15 MB are cropped and compressed locally.
- After cropping, **Apply cropped artwork** uploads the file. Then click **Save pack** or **Save border preset** to persist the artwork assignment.
- Uploads and image metadata currently live on the persistent Railway volume and remain management-only until used in a published pack.

## Editable card-face lettering and finished PNG export (v1.0)

Inside **Collections → select card → Design card**, use the **Lettering on the card** editor to set:
- Text printed on the card face (separate from the collectible card's listing title).
- Font family, font weight, optional italic, size (14–160 master-image pixels), and hex color.
- Horizontal/vertical position (0–100% of the 660 × 1020 card), alignment, or drag the lettering directly on the card preview.

The lettering is saved separately from the photo artwork and custom or built-in border. Management can change text later without re-uploading the art. Existing cards without an explicit text layer default in the editor to their member name; on save, the layer becomes independently editable.

**Download finished card (PNG)** creates a flattened **660 × 1020 px** image directly in your browser, compositing image, rarity-border overlay and editable lettering in that order. This works with unsaved changes in the editor, so download the preview before saving if desired. For durable edits, click **Save pack** separately; downloading does not change the published pack.

Only same-origin card assets may be exported. A card must have artwork to download. The print-standard pixel size is a design master, not a vendor-ready manufacturing bleed template; confirm bleed and safe areas with the printer before producing physical sets.

## Foil Lab — multi-layer holographic materials (v1.2)

**Management desktop editor:** Card Studio → Collections → select a card → **Open Foil Lab**.

Foil Lab displays the current card artwork behind the select-and-mask canvas on the left and a separate, draggable live Three.js preview on the right. Each card can have **up to eight independently masked material layers**. For example:

- Layer 1: **Holographic star**, with a small star-shaped mask; use lavender/pink colors.
- Layer 2: **Glitter border**, with a border-shaped mask; use silver or gold sparkle.
- Layer 3: **Iridescent highlight**, selected from one region of the photograph; use lime-green and yellow accents.

### Mask selection tools
- **Brush** paints the selected material region.
- **Erase** removes the region.
- **Rectangle** makes an editable rectangular selection.
- **Lasso** draws a free-form filled selection.
- **Color select** fills a connected region of similar pixels (adjust tolerance).
- **Undo**, **Fill mask**, **Invert** and **Clear** control the selection.
- **Holographic star** and **Glitter border** automatically add usable starter layers with matching masks.
- The blue overlay shows selected areas; the stored mask is a 660 × 1020 PNG, separate from the card's source art.

### Material properties
Each layer has name, type (holographic, iridescent, glitter), two tint colors, opacity, reflection strength, sparkle density, pattern scale, animation speed and enabled state. Both preset color palettes **Lavender/Pink** and **Green/Yellow** are included. Tilt/drag the 3D card to see the view-dependent reflection change.

**Apply layers to card** uploads edited masks and attaches the layer settings to the current card in the editor. **Save pack** is still required to persist/publish that assignment. Existing card images and rarity borders remain independently editable.

In the public collection, the **3D viewer is owner-only**. It uses locally bundled Three.js to draw a thin, double-sided card with a textured face, an authenticated card-back image or standard USA50 back, and the per-card material shader layers. Mask/back image requests use the signed-in session and the server rejects access to unowned card backs and masks. Shader materials are live WebGL effects; downloaded static PNG face exports currently **do not include animated foil**.

### Script lettering
Card Studio's font dropdown also includes **Great Vibes**, an open-license calligraphy font, installed locally for consistent web preview and finished PNG lettering.
