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
