FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY role-features.js ./
COPY social-hub.js ./
COPY card-studio.js ./
COPY www ./www
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
