FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY source_payload.b64 ./
COPY scripts/unpack.mjs ./scripts/unpack.mjs
RUN node scripts/unpack.mjs
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
