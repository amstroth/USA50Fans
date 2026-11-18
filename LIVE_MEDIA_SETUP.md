# USA50 Live Media — Development Setup

This feature is a **framework**, not an enabled paid streaming or public video-call service.

## Architecture

| Component | Responsibility |
| --- | --- |
| USA50 Node.js/Railway web app | Authenticated event catalog, lottery roster, host queue, temporary WebRTC signaling |
| OBS Studio (or compatible encoder) | Host video/audio capture and RTMPS publishing |
| Managed video ingest (for example Cloudflare Stream) | Accept RTMPS and deliver adaptive live video over a hosted HTTPS player |
| Browser WebRTC | Private two-way audio/video between the assigned idol and the active winner |
| STUN/TURN provider | NAT traversal and relay for mobile / restrictive networks |
| Management staff | Call queue control, break/end-early actions, live observer role |

Railway itself **does not receive or transcode the OBS live video**. OBS publishes directly to the managed provider. USA50 embeds the provider's playback URL when management marks a stream live.

## Railway environment variables

- `USA50_OBS_SERVER_URL`: managed ingest `rtmps://...` server URL, known only to management.
- `USA50_OBS_STREAM_KEY`: provider stream key. Keep private. Rotate on suspicion of compromise.
- `USA50_STREAM_PLAYBACK_HOSTS`: optional comma-separated **approved** HTTPS player hostnames, in addition to built-in Cloudflare Stream embeds.
- `USA50_STUN_URL`: STUN URI, defaults to `stun:stun.l.google.com:19302` for development.
- `USA50_TURN_URL`: TURN/TURNS URI, e.g. `turns:your-turn.example:5349`.
- `USA50_TURN_USER`: TURN username.
- `USA50_TURN_CREDENTIAL`: TURN credential.

Do not commit these values to GitHub or embed the stream key in fan-facing markup. For production, prefer ephemeral short-lived TURN credentials instead of a static browser-distributed secret.

## OBS management workflow

1. Create a livestream using a managed RTMPS ingress provider and copy its ingest server, stream key, and approved HTTPS embed/player URL.
2. Configure `USA50_OBS_SERVER_URL` and `USA50_OBS_STREAM_KEY` in Railway, then redeploy.
3. Open USA50 **Livestreams → Stream settings → OBS stream key** (management only).
4. OBS Studio → Settings → Stream → Service: Custom → paste server and key.
5. Schedule the livestream in **Livestreams**. Management selects one or more hosts; an idol may schedule a stream only for their own account. Add its approved HTTPS player URL via Stream settings.
6. Press **Start Streaming** in OBS, verify the provider shows ingest receiving video, then use **🔴 Go Live** in the React livestream studio.
7. Moderate the React live chat and TTS gifts while streaming; generate an OBS Browser Source overlay URL only if TTS is needed. End the stream in OBS and mark it **Ended** in the React studio.

The management status button is *not* an ingest start/stop control. Stream health monitoring, access-controlled/private playback, automatic status callbacks, recording retention, geographic controls and multi-bitrate delivery require configuration at the managed provider.

## Fancall host workflow

1. Management creates a free-entry lottery and optionally assigns an active idol account as its host.
2. After the published closing time, management draws winners. Winners receive notification mail and a call queue session; fans must opt in to camera/mic when their turn begins.
3. Management or the assigned idol opens **Events → Open waiting room**. The native React room shows the winner queue; the host starts the session or resumes from a break.
4. The idol selects **Connect camera & microphone** in the room. The current winner sees the call as live and can opt in.
5. Browsers exchange short-lived SDP/ICE signaling through authenticated USA50 endpoints; room status uses `/api/fancalls/session-state` for lightweight, permission-scoped queue updates. Video/audio travel via WebRTC between participants or through the configured TURN server.
6. Authorized management can select **Join as supervisor** to observe the active session. Participants receive a notice explaining that supervision is possible.
7. Idol/management may **Take a break**, **Finish & next fan** or **End this call early**. Next fan remains in the waiting room until their own session becomes active.
8. When status moves to break/next/complete, WebRTC room epoch changes and previous participants lose permission. Old media tracks are stopped in the clients.

### Launch safeguards still required

- Production TURN provider with secure, short-lived credentials and connectivity tests (cellular/Wi-Fi/VPN)
- Privacy policy, terms, consent prompt, age/eligibility rules, reporting and safety protocol
- CAPTCHA/rate-limit protections for signaling and ticket-entry abuse
- Session-join audit logs and enforcement of maximum calls/seconds per fan
- Abuse-response tooling, moderation staffing, and escalation paths
- Real-time presence/health monitoring, reconnection and recovery after idol connection loss
- Credential rotation and per-call media access controls
- Real event payment provider and clear ticketing refunds/fulfillment, if admission is sold
- Rules and regulatory review of fan lotteries and rewards; lotteries are currently **free entry**

The app's JSON-file state and in-process signaling room map are for development and do not safely support horizontal scaling. Move persistent metadata to PostgreSQL and signaling/presence to a shared low-latency store (e.g. Redis) before multi-instance deployment.

## React implementation notes

- `frontend/src/live.jsx` renders the actual configured stream player, moderator-visible live chat, virtual gifts, TTS approval/rejection, limited management OBS setup, and demo ledger. A real video feed will not appear unless the external provider is streaming to an approved playback URL.
- `frontend/src/calls.jsx` hosts native WebRTC fan/idol/supervisor rooms with explicit media permission, camera/microphone toggles, restricted winner turns, and automatic disconnect on queue changes. This is no longer displayed inside a classic iframe.
- `frontend/src/events.jsx` selects the corresponding stream when the user taps a livestream listing; rank navigation is independent at `/react/#/rankings`.
- The chat supports demo-STAR gifts with a client-generated request ID reused when a network retry may have succeeded. The server remains authoritative for balance debits and TTS refunds.
- React build checks in `tests/react-smoke.mjs` and `tests/react-media-rooms.mjs` cover feature bundle markers and backend role/queue signaling. **They do not replace browser-to-browser camera tests**.
- Reliable public WebRTC calls need a deployed TURN service, ideally short-lived per-call credentials. The current in-memory signaling server should not be scaled across multiple Railway replicas as-is.
