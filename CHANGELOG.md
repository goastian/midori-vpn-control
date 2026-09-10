# Changelog

All notable changes to Midori VPN Control are documented here.

## 2.0.0 - Unreleased

### Governance

- Added a repository-local AGPL-3.0-or-later license, private vulnerability
  reporting policy and contribution guide; the README now separates
  implemented behavior, deployment certification and pending release gates.

### Changed

- Control OCI publication now runs from an annotated semantic tag, proves two
  clean builds plus the pushed digest are identical, enforces private GHCR
  visibility, scans and attests the immutable digest, and signs it with the
  tag-bound keyless workflow identity for Core's coordinated release gate.
- Dashboard now consumes one validated summary built from registered devices,
  active sessions, quota, preserved traffic and recent session history. It no
  longer treats peer rows or repeated device names as devices, and it removes
  the misleading chart that assigned cumulative traffic to provisioning dates.
- Every remote JSON value rendered by Control is now parsed through an explicit
  Zod contract, including quota, device and session lists, dashboard data,
  server latency, administrative resources, health and Desktop callback data.
  Incomplete WebSocket statistics retain the last valid HTTP snapshot, and a
  localized per-view error boundary provides a safe retry when rendering fails.
- Control resources now use explicit idle, loading, ready, empty, error and
  refreshing states. Initial views render stable skeletons, background
  failures retain the last valid values with visible status, unavailable data
  is no longer presented as zero or a partial identifier, and device actions
  disable incompatible operations while they converge.
- Authenticated routes and navigation now remain unmounted until both the
  refreshed access token and validated profile are ready. Transient bootstrap
  failures preserve the refresh session behind a localized retry screen,
  invalid sessions resolve anonymously, and OAuth callbacks remain isolated
  from stored-session restoration.
- Connections now render one stable row per registered device with its current
  session, explicit client type, private adapter label and lifecycle state.
  Historical sessions are fetched as a validated, paginated detail only when
  expanded; alias, disconnect and device-revocation actions preserve visible
  progress and cleanup failures.
- Administrative user, user-detail, and server workflows now use localized
  accessible loading, empty, validation, dialog, and retry states. Create,
  update, suspend, and delete operations report outcomes inline, destructive
  failures remain visible in their confirmation dialog, and missing server
  health data is shown as unchecked instead of inactive.
- Administrative peer, Mesh, audit, and extension-origin views now share
  localized accessible loading, empty, and retryable error states. Filters and
  Mesh expansion expose explicit relationships, background Mesh refreshes keep
  the last usable topology, and revoke, restore, or disconnect actions report
  their outcome inline without exposing backend error details.
- Responsive navigation now reports its open state to assistive technology,
  closes on Escape or route changes, localizes every close action, and exposes
  the existing cluster-health view to administrators.
- Proxy credentials now require an explicit authenticated action instead of
  being issued when their view opens. Proxy and cluster-health screens use
  localized accessible loading, empty and retryable error states, and degraded
  health reports preserve the real PostgreSQL, WireGuard and Redis results.
- Server and connection views now share one localized, accessible quota
  summary and common loading, empty and retryable error states. Connection
  fields, warnings, notifications, table actions and the device configuration
  dialog expose explicit names and relationships without changing key or
  profile generation.
- Added a separate tag-driven private candidate workflow that refuses version
  replacement and binds the Control digest to GitHub provenance, SPDX
  attestation and an immediately verified keyless Cosign workflow identity.
- Normalized timestamps on the registry exporter as well as both clean OCI
  builds, preventing the published manifest from diverging after the
  reproducibility gate.
- Replaced direct container publication with a read-only build evidence job
  that produces a reproducible OCI archive, validates its extracted layout for
  the pinned vulnerability gate, and generates independent SBOM, provenance
  metadata and checksums using immutable workflow dependencies.
- API failures retain their stable machine-readable code, HTTP status and
  retry metadata, and connection-list schemas no longer admit preshared keys.
- Pinned Node 24.20.0 and Nginx 1.31.5 build/runtime images to exact Alpine
  3.24 digests. The slim Nginx runtime already contains libcrypto3/libssl3
  3.5.8-r0 while omitting unused libexpat and vulnerable libuuid, removing a
  redundant, non-deterministic APK upgrade layer and reducing attack surface.
- Added an administrator view for registered Firefox, Midori and Chromium extension origins, including explicit revoke and restore actions with localized status and timestamps.
- Added a mandatory `npm run check` quality gate and cleaned test-router diagnostics so successful tests do not emit framework warnings.
- Reworked the Control panel release line to 2.0.0.
- Updated the JavaScript toolchain and direct dependencies to current compatible major versions, including Vite 8, Vitest 5, Vue Router 5, Pinia 4 and Zod 4.
- Server administration now edits the normalized transport contract exclusively, including validated JSON metadata required by MASQUE, without sending retired proxy/WSS columns.
- Runtime schemas and their tests now require the normalized `transports` array, preventing an older server payload from being accepted silently.
- Release builds no longer embed production Authentik identifiers or environment-specific Vite build arguments.
- WireGuard client key pairs are generated locally with WebCrypto X25519; the private key never crosses the Control API boundary, and clients fail closed when that capability is unavailable.

### Security

- Updated Vitest and its Vite dependency chain, removing the critical development-server advisory reported by `npm audit`.

### Compatibility

- TypeScript remains on 6.x: TypeScript 7 is currently incompatible with `typescript-eslint`; revisit when upstream support is released.
- Node 24 LTS and npm 12 are enforced in local tooling and CI.
