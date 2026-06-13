# Jaifu frontend — same multi-stage pattern as the root KandA frontend,
# but pinned to Node 20 (new service, no Node 18 constraint).

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Vite bakes VITE_* in at build time. VITE_API_BASE_URL is optional — the
# server serves the API same-origin, so leave it unset unless the API lives
# elsewhere. VITE_FEEDBACK_URL defaults to a mailto when unset.
ARG VITE_API_BASE_URL
ARG VITE_FEEDBACK_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FEEDBACK_URL=$VITE_FEEDBACK_URL

RUN npm run build


# --- Runtime ---------------------------------------------------------
# Only express + pg are needed at runtime (browser libs are bundled into
# dist/), so --omit=dev keeps the image lean.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./
COPY server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "server.js"]
