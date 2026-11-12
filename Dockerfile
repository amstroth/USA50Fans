FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY role-features.js ./
COPY social-hub.js ./
COPY official-diary.js ./
COPY card-studio.js ./
COPY www ./www
# Fail the deployment if Card Studio has a JavaScript parsing error.
RUN node --check official-diary.js && node --check www/diary-social.js && node --check www/studio.js
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
