# Changelog

All notable changes to Midori VPN Control are documented here.

## 2.0.0 - 2026-08-24

### Changed

- API failures retain their stable machine-readable code, HTTP status and
  retry metadata, and connection-list schemas no longer admit preshared keys.
- Pinned Node 24.20.0 and Nginx 1.31.4 build/runtime images to exact Alpine 3.24 digests so clean Control builds do not depend on mutable container tags.
- Added an administrator view for registered Firefox, Midori and Chromium extension origins, including explicit revoke and restore actions with localized status and timestamps.
- Added a mandatory `npm run check` quality gate and cleaned test-router diagnostics so successful tests do not emit framework warnings.
- Reworked the Control panel release line to 2.0.0.
- Updated the JavaScript toolchain and direct dependencies to current compatible major versions, including Vite 8, Vitest 4, Vue Router 5, Pinia 4 and Zod 4.
- Server administration now edits the normalized transport contract exclusively, including validated JSON metadata required by MASQUE, without sending retired proxy/WSS columns.
- Runtime schemas and their tests now require the normalized `transports` array, preventing an older server payload from being accepted silently.
- Release builds no longer embed production Authentik identifiers or environment-specific Vite build arguments.
- WireGuard client key pairs are generated locally with WebCrypto X25519; the private key never crosses the Control API boundary, and clients fail closed when that capability is unavailable.

### Security

- Updated Vitest and its Vite dependency chain, removing the critical development-server advisory reported by `npm audit`.

### Compatibility

- TypeScript remains on 6.x: TypeScript 7 is currently incompatible with `typescript-eslint`; revisit when upstream support is released.
- Node 24 LTS and npm 12 are enforced in local tooling and CI.
