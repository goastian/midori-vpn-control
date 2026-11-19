# Contributing to MidoriVPN Control

MidoriVPN Control 2.0.0 is unreleased. Contributions must distinguish source
behavior from deployment certification and must not embed environment-specific
identity configuration in the static bundle.

## Before starting

- Use a public issue for bugs and behavior proposals.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
- Keep credentials, OAuth material, private endpoints, logs and local build
  evidence out of commits and issue attachments.
- Coordinate Core contract changes with the Core OpenAPI document and affected
  consumers.

## Development and checks

Use the pinned rootless runner from a Core checkout:

```bash
CORE_REPO=/absolute/path/to/midori-vpn-core
bash "$CORE_REPO/scripts/pod.sh" npm ci
bash "$CORE_REPO/scripts/pod.sh" npm run check
bash "$CORE_REPO/scripts/pod.sh" npm audit --audit-level=high
```

Changes to remote data must retain explicit Zod validation and honest loading,
empty, refreshing and error states. Changes to visible text must update all ten
locale modules with matching keys and placeholders. Authentication and
authorization failures must remain fail-closed.

Use the newest compatible dependency release; do not resolve advisories with
obsolete downgrades. Update `2.0.0 - Unreleased` in `CHANGELOG.md` for visible,
security or operational changes. Before submitting, run `git diff --check` and
describe behavior, accessibility, tests, API dependencies and risk in the pull
request.

## License

By contributing, you agree that your contribution is licensed under
AGPL-3.0-or-later, as described in [LICENSE](LICENSE).
