ARG SOURCE_DATE_EPOCH=0

# ── Stage 1: Build ──
FROM docker.io/library/node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS builder

WORKDIR /app

RUN npm install --global npm@12.2.2

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html env.d.ts tsconfig.json tsconfig.node.json vite.config.ts ./
COPY src ./src

RUN npm run build

# ── Stage 2: Production Nginx Runtime ──
FROM docker.io/library/nginx:1.31.8-alpine3.24-slim@sha256:4c734d33ee731135dc9f2349914a34551c920f4451fca8bb05bf5880eb9079e8

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]
