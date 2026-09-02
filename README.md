# MidoriVPN Control 2.0.0

Vue administration and user SPA for MidoriVPN Core. Runtime identity configuration is obtained from Core; release bundles do not embed staging or production Authentik identifiers.

## Stack

- Node.js 24 LTS and npm 12.
- Vue 3, Pinia 4 and Vue Router 5.
- TypeScript 6.0.3 and vue-tsc 3.
- Vite 8, Vitest 4, ESLint 10 and Zod 4.

TypeScript 7 is intentionally not installed while `typescript-eslint` declares a `<6.1` peer range.

## Rootless workflow

The pinned rootless runner mounts the Core checkout as one coordinated source
tree. Place this repository at `<core>/midori-vpn-control`, then run from this
directory:

```bash
bash ../scripts/pod.sh npm ci
bash ../scripts/pod.sh npm run check
bash ../scripts/pod.sh npm audit --audit-level=high
bash ../scripts/pod.sh npm run dev
```

`npm run check` runs lint with zero warnings, the complete unit/component suite,
type checking and a production build.

## Authentication

The SPA uses OAuth 2.0/OIDC Authorization Code + PKCE. It reads the public provider configuration from `/api/v1/auth/config`, stores the verifier only for the callback transaction and sends protected API requests with the access token. Refresh handling and origin validation are implemented through Core.

Do not add `VITE_AUTHENTIK_*` production constants or secrets to the build. The same static bundle must be environment-neutral.

## Administration

The server editor writes one normalized `transports` array. Every item includes protocol, host, port, enabled state, priority and a JSON metadata object. Health status is read-only and produced by Core probes.

Supported contract names are `wireguard`, `wss`, `masque`, `openvpn`, `ikev2` and `proxy`; an entry is not a client capability until Core reports it healthy. There are no parallel `proxy_port` or `wss_*` server fields.

Other views cover users and quotas, peers, audit events, mesh networks, proxy state, billing entitlement and cluster health.

## Production

```bash
bash ../scripts/pod.sh npm run build
```

Serve `dist/` behind the host HTTPS virtual host. The Nginx image/config provides SPA fallback and forwards `/api/` and WSS to Core over the internal pod network. No container HTTP port is public.

## License

AGPL-3.0-or-later; see the
[project license](https://github.com/goastian/midori-vpn-core/blob/main/LICENSE).
