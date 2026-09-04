# Security policy

## Supported versions

MidoriVPN Control 2.0.0 is currently unreleased. Security fixes are applied to
the 2.0.0 development line, but that source must not be treated as a supported
production release. Earlier release lines are no longer maintained by this
repository.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the
[private GitHub security advisory form](https://github.com/goastian/midori-vpn-control/security/advisories/new).
Report a Core API or cross-component issue in the
[Core repository](https://github.com/goastian/midori-vpn-core/security/advisories/new)
and identify Control as affected.

Include the affected version or commit, a minimal reproduction, impact and
sanitized diagnostics. Remove OAuth codes, tokens, user data, private
endpoints and deployment configuration. Never send live credentials or
production data.

## Response and disclosure

The maintainers aim to acknowledge a complete report within three business
days and provide an initial triage within seven business days. Please keep the
report private until a fix and disclosure date are agreed. Validated fixes must
pass authentication, authorization, schema, rendering and production-build
gates before a release is announced.

Reports involving OAuth/PKCE, authorization, unsafe rendering, secret
exposure, origin handling or supply-chain integrity are in scope.
