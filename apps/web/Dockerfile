# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache bash

# Build args
ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy package files first for better caching
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install ALL dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the web workspace
RUN npm run build --workspace=apps/web

# Production stage
FROM nginx:alpine
RUN apk add --no-cache curl

# Copy built files from build stage
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5173/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
