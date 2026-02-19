# syntax=docker/dockerfile:1.15-labs

# Build stage:
FROM node:24-alpine AS builder
RUN apk add --no-cache brotli

# Build-time env variables
ARG SENTRY_DSN
ARG PATH_PREFIX
ARG API_URL
ARG BRANDING_HEADER_TITLE_TEXT
ARG BRANDING_HEADER_TITLE_TEXT_SHORT
ARG BRANDING_FOOTER_GDPR_TEXT
ARG BRANDING_FOOTER_GDPR_LINK
ARG BRANDING_FOOTER_HOME_TEXT
ARG BRANDING_FOOTER_HOME_LINK
ARG BRANDING_LOGIN_PLACEHOLDER_EMAIL
ARG FRONTENDS

WORKDIR /opt/ilmomasiina

# Copy files needed for dependency installation
COPY --parents .eslint* package.json pnpm-*.yaml packages/*/package.json /opt/ilmomasiina/

# Install dependencies (we're running as root, so the postinstall script doesn't run automatically)
RUN corepack enable && pnpm install --frozen-lockfile

# Copy rest of source files
COPY packages /opt/ilmomasiina/packages

# Default to production (after pnpm install, so we get our types etc.)
ENV NODE_ENV=production

# Build all packages
RUN npm run build

# precompress static files for frontend
RUN find packages/ilmomasiina-frontend/build -type f\
  -regex ".*\.\(js\|json\|html\|map\|css\|svg\|ico\|txt\)" -exec gzip -k "{}" \; -exec brotli "{}" \;

# Main stage:
FROM node:24-alpine

# Accept VERSION at build time, pass to backend server
ARG VERSION
ENV VERSION=$VERSION

# Default to production
ENV NODE_ENV=production

# Listen at 0.0.0.0 when inside Docker
ENV HOST=0.0.0.0

WORKDIR /opt/ilmomasiina

# Copy files needed for dependency installation
COPY --parents package.json pnpm-*.yaml packages/*/package.json /opt/ilmomasiina/

# Install dependencies for backend only
RUN corepack enable && pnpm install --frozen-lockfile --prod --filter @tietokilta/ilmomasiina-backend --filter @tietokilta/ilmomasiina-models

# Copy rest of source files
COPY packages /opt/ilmomasiina/packages

# Copy compiled ilmomasiina-models from build stage
COPY --from=builder /opt/ilmomasiina/packages/ilmomasiina-models/dist /opt/ilmomasiina/packages/ilmomasiina-models/dist

# Copy built backend from build stage
COPY --from=builder /opt/ilmomasiina/packages/ilmomasiina-backend/dist /opt/ilmomasiina/packages/ilmomasiina-backend/dist

# Copy built frontend from build stage
COPY --from=builder /opt/ilmomasiina/packages/ilmomasiina-frontend/build /opt/ilmomasiina/frontend

# Create user for running
RUN adduser -D -h /opt/ilmomasiina ilmomasiina
USER ilmomasiina

# Start server
CMD ["node", "packages/ilmomasiina-backend/dist/bin/server.js"]
