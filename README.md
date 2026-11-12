# USA50 Fans — Railway Web App

USA50's fan web app with planned iOS and Android conversion through Capacitor.

This repository is being initialized with the USA50 development build. This is an internal development preview, not a production commerce platform.

## Deployment
- Host with Railway using the Dockerfile.
- App health endpoint: `/api/health`.
- Set `SESSION_SECRET`, `ADMIN_PASSWORD` and `DATA_DIR` in Railway environment variables; mount a persistent volume at `/data` for the development-only JSON database.
- Never commit credentials. Real subscriptions, payments, card printing and fan data require production services and security review.
