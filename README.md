# MidoriVPN Control 2.0.0

Vue administration and user SPA for MidoriVPN Core. Runtime identity configuration is obtained from Core; release bundles do not embed staging or production Authentik identifiers.

## Release status

| Category | Current state |
|---|---|
| Implemented | Authenticated user and administration views, validated API contracts, explicit resource states and multicluster administration are present and covered by the repository checks. |
| Certified | Integrated principal-staging workflows have been validated; that evidence does not certify an arbitrary deployment or regional server. |
| Pending | 2.0.0 remains **Unreleased**. Regional acceptance and final coordinated artifact validation are still required. |

Public pages show pre-release status instead of simulated statistics, pricing
or service guarantees. `/download`, `/privacy` and `/terms` remain reachable
without restoring an account session, even when authentication is unavailable.
The legal routes contain explicit pending-approval notices, **not approved VPN
policies**; legal review remains a launch/store gate. Download links must not be
enabled until signed, validated artifacts or store listings actually exist.

The static server supplies CSP and related security headers, including for
cached assets. It makes no third-party font requests. HSTS belongs at the TLS
ingress (the Core vhost template), not on this internal HTTP listener.

## Stack

- Node.js 24 LTS and npm 12.
- Vue 3, Pinia 4 and Vue Router 5.
- TypeScript 6.0.3 and vue-tsc 3.
- Vite 8, Vitest 5, ESLint 10 and Zod 4.

TypeScript 7 is intentionally not installed while `typescript-eslint` declares a `<6.1` peer range.

## Rootless workflow

The pinned rootless runner discovers this repository either below the Core
checkout or beside it. Point `CORE_REPO` at Core with an absolute path, then run
from this directory:

```bash
CORE_REPO=/absolute/path/to/midori-vpn-core
bash "$CORE_REPO/scripts/pod.sh" npm ci
bash "$CORE_REPO/scripts/pod.sh" npm run check
bash "$CORE_REPO/scripts/pod.sh" npm audit --audit-level=high
bash "$CORE_REPO/scripts/pod.sh" npm run dev
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
CORE_REPO=/absolute/path/to/midori-vpn-core
bash "$CORE_REPO/scripts/pod.sh" npm run build
```

Serve `dist/` behind the host HTTPS virtual host. The Nginx image/config provides SPA fallback and forwards `/api/` and WSS to Core over the internal pod network. No container HTTP port is public.

## License

AGPL-3.0-or-later; see the
[repository license](LICENSE).

Security reports and contributions are governed by [SECURITY.md](SECURITY.md)
and [CONTRIBUTING.md](CONTRIBUTING.md).
