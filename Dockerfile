ARG SOURCE_DATE_EPOCH=0

# ── Stage 1: Build ──
FROM docker.io/library/node:24.20.0-alpine3.24@sha256:4caaaf42195bcd6f6f3559a413b20cb8f8ad089e231ee874cf7701643966689f AS builder

WORKDIR /app

RUN npm install --global npm@12.0.2

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html env.d.ts tsconfig.json tsconfig.node.json vite.config.ts ./
COPY src ./src

RUN npm run build

# ── Stage 2: Production Nginx Runtime ──
FROM docker.io/library/nginx:1.31.5-alpine3.24-slim@sha256:f1865067f7bc1222cab3d68a85b5f226ef15dfed923e93e5ddbc625bd6cd5a1a

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]
