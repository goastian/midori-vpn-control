# ── Stage 1: Build ──
FROM docker.io/library/node:24-alpine AS builder

WORKDIR /app

RUN npm install --global npm@12.0.2

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html env.d.ts tsconfig.json tsconfig.node.json vite.config.ts ./
COPY src ./src

RUN npm run build

# ── Stage 2: Production Nginx Runtime ──
FROM docker.io/library/nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]
