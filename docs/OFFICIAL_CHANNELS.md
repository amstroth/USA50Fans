# USA50 Official Channels (v1.4)

The Official Channels gallery on the Social tab displays **four posts per page**, with an image thumbnail when available, a post title, platform, and publication date. Each card opens the original platform post in a new browser tab.

## Why Instagram / TikTok can appear empty

- **YouTube** is polled through its official public RSS feed when management enters a valid YouTube channel ID. New uploads are imported about every ten minutes.
- **Instagram and TikTok** cannot be turned into automatic feeds by simply entering usernames in management settings. Automatic ingestion requires a separate provider-authorized service configured to send verified post events to `POST /api/official/ingest` with the `x-usa50-webhook-secret` header and the Railway `USA50_OFFICIAL_WEBHOOK_SECRET` environment variable.
- Until those integrations exist, management can add individual official posts immediately. This is an intentional curated fallback, **not** a claim that the social platforms have been connected.

## Add a post without a provider integration

1. Sign into the management account, finish any required password change, and open **Management Dashboard**.
2. Scroll to **USA50 Official Feed**. Set the YouTube channel ID if available, then save.
3. Under **Add an official post**, paste a public YouTube video, Instagram post/reel, or TikTok video URL, then enter a title.
4. Optionally upload a source cover image (best for Instagram). The browser resizes it before upload.
5. Choose **Add to Official Channels**. The post appears in the Social tab's Official Channels gallery.
6. Management can remove an imported post using the × control on its card.

### Thumbnail behavior

- **YouTube**: derives the video thumbnail directly from YouTube's official thumbnail CDN.
- **TikTok**: requests the platform's public oEmbed metadata. If `thumbnail_url` is provided, the backend fetches and stores a copy on the persistent Railway volume, to avoid later expiration of the CDN URL. The response can omit the thumbnail or fail for unavailable/restricted posts; in that case management can upload the approved cover.
- **Instagram**: Meta's modern oEmbed API no longer returns `thumbnail_url`. An approved provider webhook may provide a source thumbnail URL, or management can supply an official source image using the upload field.
- The app always displays a branded fallback instead of a broken image when no source cover exists.

All imported post URLs are restricted to supported official platform patterns. External thumbnail URLs from authorized webhook events are validated against known image CDN hostnames, and cached images must be valid JPG/PNG/WebP below the size limit. User-controlled arbitrary remote URLs are not fetched.

This preview does not scrape private accounts or promise automatic visibility of removed, age-restricted, or private content.


## Automatic official Instagram and TikTok imports (v1.5)

The server can **poll the authorized provider APIs every 20 minutes** (and on startup) to import new official posts automatically. This is not scraping or a username-only feed: the relevant platform owner must grant your developer app access first. The existing management-upload form and verified webhook remain available.

### Instagram — Meta Graph API

1. Convert the official USA50 Instagram profile to a **Professional Business or Creator** account if it isn't one.
2. Create/authorize an app through [Meta for Developers](https://developers.facebook.com/) with access to that Instagram account. Choose a supported login method:
   - **Instagram Login**: obtain an authorized Instagram User token with at least the `instagram_business_basic` permission. Configure `USA50_INSTAGRAM_GRAPH_HOST=graph.instagram.com`.
   - **Facebook Login**: connect the Instagram Professional account to a Facebook Page, obtain the account's IG User ID and an authorized Page/System User access token with the required Instagram/Page read permissions. Use the default `graph.facebook.com` host.
3. In **Railway → USA50 → usa50-fan-club → Variables**, set:
   - `USA50_INSTAGRAM_USER_ID`: the numeric IG User ID from the API, **not** the @handle.
   - `USA50_INSTAGRAM_ACCESS_TOKEN`: an authorized access token kept secret, ideally long-lived or managed by a trusted system-user flow.
   - `USA50_INSTAGRAM_GRAPH_HOST`: `graph.instagram.com` for Instagram Login or `graph.facebook.com` for Facebook Login (defaults to Facebook).
4. Redeploy after saving the variables. Management Dashboard → USA50 Official Feed will show the importer as **Credentials configured**. Press **Check connected feeds now** to test it. The dashboard shows the last successful check or a readable API error.
5. The importer requests the latest 25 posts with `id,caption,media_type,media_url,thumbnail_url,permalink,timestamp`, then saves new items by their verified source permalinks. Source covers are cached when possible.

**Token lifecycle:** Meta access tokens can expire or be revoked. This version does **not** run an Instagram OAuth login or refresh-token exchange. Use a properly authorized durable token where permitted, or renew the configured token using the provider's approved process when it expires. An expired token will report a sync error rather than silently inventing posts.

### TikTok — Display API

1. Create a [TikTok developer app](https://developers.tiktok.com/) and obtain approval for **Login Kit**, **Display API**, and at least the `video.list` scope.
2. Have the owner of the official USA50 TikTok account authorize the app. Exchange the OAuth authorization code for that account's access and refresh tokens on your server. Never share credentials publicly.
3. Configure Railway Variables on the same service:
   - `USA50_TIKTOK_CLIENT_KEY`
   - `USA50_TIKTOK_CLIENT_SECRET`
   - `USA50_TIKTOK_REFRESH_TOKEN`: the refresh token obtained from the **official account's approved OAuth flow**.
   - `USA50_TIKTOK_USERNAME`: the official @handle without the @ (optional when the API supplies a supported share URL).
   - Optionally `USA50_TIKTOK_ACCESS_TOKEN` if you already have a valid short-lived access token; the app can refresh it automatically with the client credentials above.
4. Redeploy, then use **Check connected feeds now** in Management Dashboard.
5. The importer calls `POST https://open.tiktokapis.com/v2/video/list/` for recent public account videos, including their captions, cover image URLs and share URLs. TikTok's image CDN URLs expire, so the server caches available thumbnails on its Railway volume.
6. When the access token expires, the backend calls `POST https://open.tiktokapis.com/v2/oauth/token/`, stores the **rotated refresh token** on the persistent Railway volume, and continues polling. TikTok can require reauthorization if refresh expires or is revoked.

### Important operational details

- New posts are **deduplicated by provider platform and post ID**. A fresh check does not create duplicate cards.
- API credentials are read only on the server. They are not sent in the fan-facing bootstrap, management dashboard, or GitHub source.
- Only public posts accessible through the authorized professional/developer API can sync. Stories, private posts, unavailable videos, or posts outside provider API scope may not appear.
- The UI distinguishes `Credentials configured` from `Last successful import`. Merely setting a token is not proof that the provider has granted correct permissions.
- **Manual additions** and verified webhook events remain supported if OAuth approval is still pending.
- Removing tokens from Railway stops new polling, but also revoke app access in the provider's developer settings if you disconnect an account.
- Instagram and TikTok can change permissions and token-expiry behavior; review each provider's developer documentation when configuring your app.
