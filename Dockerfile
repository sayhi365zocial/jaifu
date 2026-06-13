# Jaifu frontend — same multi-stage pattern as the root KandA frontend,
# but pinned to Node 20 (new service, no Node 18 constraint).

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Vite bakes these in at build time — Railway exposes service env vars
# during the build phase.
ARG VITE_API_BASE_URL
ARG VITE_FEEDBACK_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FEEDBACK_URL=$VITE_FEEDBACK_URL

RUN npm run build


# --- Runtime ---------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "server.js"]
