# Build the React UI separately. Legacy feature scripts and backend remain intact.
FROM node:22-alpine AS react-builder
WORKDIR /app
COPY package.json ./
COPY vite.config.mjs ./
COPY frontend ./frontend
COPY tests/react-experiences.mjs ./tests/react-experiences.mjs
RUN npm install --ignore-scripts --no-audit --no-fund
RUN node tests/react-experiences.mjs && npm run build:react && test -s www/react/index.html && test -d www/react/assets

FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY server.js ./
COPY fancall-lottery.js ./
COPY economy-pricing.js ./
COPY gacha-rewards.js ./
COPY vip-program.js ./
COPY notification-center.js ./
COPY event-streams.js ./
COPY livestream-social.js ./
COPY web-push-service.js ./
COPY tests/live-streams.mjs ./tests/live-streams.mjs
COPY tests/social-images.mjs ./tests/social-images.mjs
COPY tests/social-delete-comments.mjs ./tests/social-delete-comments.mjs
COPY tests/social-daily-limit.mjs ./tests/social-daily-limit.mjs
COPY tests/idol-profiles.mjs ./tests/idol-profiles.mjs
COPY tests/idol-gallery.mjs ./tests/idol-gallery.mjs
COPY tests/official-channels.mjs ./tests/official-channels.mjs
COPY tests/react-smoke.mjs ./tests/react-smoke.mjs
COPY tests/react-media-rooms.mjs ./tests/react-media-rooms.mjs
COPY fancall-rtc.js ./
COPY role-features.js ./
COPY idol-profiles.js ./
COPY idol-gallery.js ./
COPY social-hub.js ./
COPY official-diary.js ./
COPY official-auto-sync.js ./
COPY card-studio.js ./
COPY www ./www
COPY --from=react-builder /app/www/react ./www/react
# Ship the exact Three.js module and the licensed local script font with the app.
RUN mkdir -p www/vendor www/assets/fonts \
 && cp node_modules/three/build/three.module.js www/vendor/three.module.js \
 && cp node_modules/three/build/three.core.js www/vendor/three.core.js \
 && cp node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2 www/assets/fonts/great-vibes-latin-400-normal.woff2 \
 && (cp node_modules/@fontsource/great-vibes/OFL.txt www/assets/fonts/Great-Vibes-LICENSE.txt 2>/dev/null || echo 'Great Vibes by Robert Leuschke, licensed OFL-1.1; https://fontsource.org/fonts/great-vibes/about' > www/assets/fonts/Great-Vibes-LICENSE.txt)
# Three.js >= r164 uses a separate ESM core. A missing core used to leave
# Card Studio online but break every 3D preview after import.
RUN test -s www/vendor/three.module.js && test -s www/vendor/three.core.js \
 && node --check www/vendor/three.module.js \
 && node --check www/vendor/three.core.js
# Fail the deployment if Card Studio has a JavaScript parsing error.
RUN node --check server.js && node --check fancall-lottery.js && node --check economy-pricing.js && node --check gacha-rewards.js && node --check vip-program.js && node --check notification-center.js && node --check event-streams.js && node --check livestream-social.js && node --check web-push-service.js && node --check www/livestream-v27.js && node --check www/interactive-preview-v28.js && node --check www/immersive-live-v29.js && node --check www/live-tts-overlay.js && node --check fancall-rtc.js && node --check social-hub.js && node --check card-studio.js && node --check www/fancall-social-v17.js && node --check www/economy-v19.js && node --check www/gacha-reveal-v20.js && node --check www/social-roles-v22.js && node --check www/notification-center-v23.js && node --check www/diary-layout-v24.js && node --check www/event-stream-v25.js && node --check www/fancall-rtc-v26.js && node --check www/social-profile-v16.js && node --check official-auto-sync.js && node -e "require('./official-auto-sync.js')" && node --check official-diary.js && node --check www/diary-social.js && node --check www/studio.js && node --check www/idol-studio-v10.js && node --check www/dream.js && node --check role-features.js && node --check idol-profiles.js && node --check idol-gallery.js
RUN test -s www/react/index.html && test -d www/react/assets && node --check www/react-bridge.js
RUN node tests/live-streams.mjs
RUN node tests/idol-profiles.mjs
RUN node tests/idol-gallery.mjs
RUN node tests/social-images.mjs
RUN node tests/social-delete-comments.mjs
RUN node tests/social-daily-limit.mjs
RUN node tests/official-channels.mjs
RUN node tests/react-smoke.mjs
RUN node tests/react-media-rooms.mjs
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
