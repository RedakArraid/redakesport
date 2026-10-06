FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci
COPY apps apps
COPY database database
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:24-alpine
WORKDIR /app
ENV HOST=0.0.0.0 PORT=3001
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/var/uploads && chown -R node:node /app/var
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node apps/api/src/migrate.mjs && node apps/api/src/server.mjs"]
