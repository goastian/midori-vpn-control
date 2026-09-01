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
FROM docker.io/library/nginx:1.31.4-alpine3.24@sha256:1f25fedd50aec27413031afb3a4f8ee4effcc9d843f6a76e81bfa92245ac5c06

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]
