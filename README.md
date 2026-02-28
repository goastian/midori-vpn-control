```md
# MidoriVPN Control — Frontend

Web control panel for MidoriVPN. SPA application built with **Vue 3**, **TypeScript**, **Vite**, and **TailwindCSS**.

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Vue 3 | ^3.4 | Reactive UI framework (Composition API + `<script setup>`) |
| TypeScript | ^5.5 | Static typing |
| Vite | ^5.3 | Bundler and development server |
| Pinia | ^2.1 | State management |
| Vue Router | ^4.4 | SPA routing |
| TailwindCSS | ^3.4 | Utility-first styling |
| VueUse | ^10.11 | Utility composables |

## Project Structure

```

control/
├── .env                    → Environment variables (Vite)
├── index.html              → HTML entry point
├── package.json            → Dependencies and scripts
├── vite.config.ts          → Vite config + API proxy
├── tailwind.config.js      → Tailwind configuration (midori palette)
├── postcss.config.js       → PostCSS plugins
├── tsconfig.json           → TypeScript config
├── tsconfig.node.json      → TypeScript config (Node)
├── env.d.ts                → Environment variable types
└── src/
├── main.ts             → Bootstrap: Vue + Pinia + Router
├── App.vue             → Main layout with conditional NavBar
├── assets/
│   └── main.css        → Tailwind base imports
├── components/
│   └── NavBar.vue      → Navigation bar (Dashboard, Servers, Peers, Audit)
├── lib/
│   ├── api.ts          → HTTP client with automatic Bearer token
│   └── pkce.ts         → PKCE utilities (code_verifier, code_challenge SHA-256)
├── router/
│   └── index.ts        → Routes + navigation guard (auth required)
├── stores/
│   └── auth.ts         → Authentication store (login, callback, logout, profile)
└── views/
├── LoginView.vue       → Login screen with OAuth button
├── AuthCallback.vue    → Processes Authentik redirect (code → token)
├── DashboardView.vue   → Overview: active servers, peers, account
├── ServersView.vue     → VPN server CRUD (admin)
├── PeersView.vue       → User VPN connection management
└── AuditView.vue       → Audit log

````

## Requirements

- **Node.js 20+** and **npm 10+**
- `vpn-core` backend running at `localhost:8080` (or configure `VITE_API_URL`)

## Installation

```bash
cd control
npm install
````

## Development

```bash
npm run dev
```

Open `http://localhost:5173`. Vite’s proxy forwards `/api/*`, `/auth/*`, and `/health` to the backend at `:8080`.

## Production Build

```bash
npm run build
```

Static files are generated in `control/dist/`. They can be served with Nginx, Caddy, or any static web server.

## Environment Variables

`.env` file at the root of `control/`:

| Variable                      | Example                                               | Description                               |
| ----------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| `VITE_API_URL`                | `http://localhost:8080`                               | Backend API URL                           |
| `VITE_AUTHENTIK_ISSUER`       | `https://accounts.astian.org/application/o/midorivpn` | Authentik OIDC issuer                     |
| `VITE_AUTHENTIK_CLIENT_ID`    | `60mBgw8BHTvK...`                                     | OAuth2 application Client ID in Authentik |
| `VITE_AUTHENTIK_REDIRECT_URI` | `http://localhost:5173/auth/callback`                 | Post-login redirect URI                   |

## Authentication Flow (OAuth2/OIDC + PKCE)

```
┌──────────┐     1. startLogin()      ┌──────────────────┐
│  Browser │ ──────────────────────→  │  accounts.astian │
│ (Vue SPA)│                          │   .org (Authentik)│
│          │  ← 2. redirect with code │                  │
│          │ ──────────────────────→  │                  │
└─────┬────┘                          └──────────────────┘
      │
      │ 3. POST /auth/callback
      │    { code, redirect_uri, code_verifier }
      ▼
┌──────────┐     4. Token exchange     ┌──────────────────┐
│ vpn-core │ ──────────────────────→  │    Authentik     │
│ (Go API) │  ← access_token, id_tok  │    Token endpoint│
│          │                          └──────────────────┘
└─────┬────┘
      │ 5. Returns tokens to frontend
      ▼
┌──────────┐
│  Browser │  → Stores access_token in localStorage
│          │  → GET /api/v1/control/me (profile)
│          │  → Redirects to Dashboard
└──────────┘
```

### Detailed Steps

1. **`startLogin()`** — Generates `code_verifier` (128 random chars), computes `code_challenge` (SHA-256 + base64url), stores the verifier in `sessionStorage`, and redirects to Authentik’s authorization endpoint with PKCE parameters.

2. **Authentik** — Displays login, the user authenticates, and is redirected to `/auth/callback?code=...`

3. **`AuthCallback.vue`** — Reads the `code` from the URL, retrieves the `code_verifier` from `sessionStorage`, and sends both to the backend.

4. **Backend** (`POST /auth/callback`) — Exchanges the code + verifier with Authentik and returns the tokens to the frontend.

5. **Frontend** — Stores `access_token` in `localStorage`, loads the user profile, and redirects to the Dashboard.

## Routes

| Route            | View            | Auth      | Description                    |
| ---------------- | --------------- | --------- | ------------------------------ |
| `/login`         | `LoginView`     | Public    | Login button with Astian       |
| `/auth/callback` | `AuthCallback`  | Public    | Processes Authentik redirect   |
| `/`              | `DashboardView` | Protected | General overview               |
| `/servers`       | `ServersView`   | Protected | Server management (admin CRUD) |
| `/peers`         | `PeersView`     | Protected | User VPN connections           |
| `/audit`         | `AuditView`     | Protected | Audit logs                     |

## Consumed API

All protected endpoints automatically send `Authorization: Bearer <token>` via `lib/api.ts`.

| Method   | Endpoint                      | Purpose                  |
| -------- | ----------------------------- | ------------------------ |
| `GET`    | `/auth/config`                | OIDC configuration       |
| `POST`   | `/auth/callback`              | Exchange code → tokens   |
| `GET`    | `/api/v1/control/me`          | Current user profile     |
| `GET`    | `/api/v1/control/servers`     | List active VPN servers  |
| `POST`   | `/api/v1/control/servers`     | Create server (admin)    |
| `DELETE` | `/api/v1/control/servers/:id` | Delete server (admin)    |
| `GET`    | `/api/v1/control/peers`       | List my VPN connections  |
| `POST`   | `/api/v1/control/peers`       | Connect to a server      |
| `DELETE` | `/api/v1/control/peers/:id`   | Disconnect from a server |
| `GET`    | `/api/v1/control/audit`       | My audit logs            |

## Color Palette

Defined in `tailwind.config.js` under the `midori` key:

| Name         | Hex       | Usage                    |
| ------------ | --------- | ------------------------ |
| `midori-50`  | `#f0fdf4` | Light backgrounds, hover |
| `midori-100` | `#dcfce7` | Login gradients          |
| `midori-500` | `#22c55e` | Accents                  |
| `midori-600` | `#16a34a` | Primary buttons          |
| `midori-700` | `#15803d` | Button hover             |

## Backend Relationship

This frontend **does not contain backend logic**. All business logic, JWT authentication, database management, and WireGuard handling reside in the `vpn-core` (Go) service running at the repository root.

The two backend middlewares are complementary:

* **`internal/api/middleware.go`** — Validates `X-Core-Token` (shared secret for the WireGuard core API)
* **`internal/auth/middleware.go`** — Validates Authentik JWT Bearer (for the Control API consumed by this frontend)

```
```
