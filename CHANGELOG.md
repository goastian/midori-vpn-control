# Changelog

All notable changes to Midori VPN Control are documented here.

## 2.0.0 - 2026-08-24

### Changed

- Added a mandatory `npm run check` quality gate and cleaned test-router diagnostics so successful tests do not emit framework warnings.
- Reworked the Control panel release line to 2.0.0.
- Updated the JavaScript toolchain and direct dependencies to current compatible major versions, including Vite 8, Vitest 4, Vue Router 5, Pinia 4 and Zod 4.
- Server administration now edits the normalized transport contract exclusively, including validated JSON metadata required by MASQUE, without sending retired proxy/WSS columns.
- Runtime schemas and their tests now require the normalized `transports` array, preventing an older server payload from being accepted silently.
- Release builds no longer embed production Authentik identifiers or environment-specific Vite build arguments.

### Security

- Updated Vitest and its Vite dependency chain, removing the critical development-server advisory reported by `npm audit`.

### Compatibility

- TypeScript remains on 6.x: TypeScript 7 is currently incompatible with `typescript-eslint`; revisit when upstream support is released.
- Node 24 LTS and npm 12 are enforced in local tooling and CI.
