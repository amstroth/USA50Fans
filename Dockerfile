FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY server.js ./
COPY role-features.js ./
COPY social-hub.js ./
COPY official-diary.js ./
COPY official-auto-sync.js ./
COPY card-studio.js ./
COPY www ./www
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
RUN node --check official-auto-sync.js && node -e "require('./official-auto-sync.js')" && node --check official-diary.js && node --check www/diary-social.js && node --check www/studio.js && node --check www/idol-studio-v10.js && node --check www/dream.js && node --check role-features.js
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
