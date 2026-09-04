#!/usr/bin/env bash
set -Eeuo pipefail

readonly TRIVY_IMAGE='docker.io/aquasec/trivy:0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
EXCEPTIONS_FILE="${VULNERABILITY_EXCEPTIONS_FILE:-${ROOT_DIR}/security/vulnerability-exceptions.json}"
CONTAINER_ENGINE="${CONTAINER_ENGINE:-podman}"
TRIVY_PULL_POLICY="${TRIVY_PULL_POLICY:-missing}"

usage() {
  printf 'Usage: %s archive OCI_ARCHIVE REPORT_JSON\n' "$0" >&2
  printf '       %s image IMAGE_AT_DIGEST REPORT_JSON\n' "$0" >&2
  exit 2
}

[[ $# -eq 3 ]] || usage
mode="$1"
target="$2"
report_path="$3"
[[ "$mode" == archive || "$mode" == image ]] || usage

for command_name in "$CONTAINER_ENGINE" jq date mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'error: required command not found: %s\n' "$command_name" >&2
    exit 1
  }
done
[[ -f "$EXCEPTIONS_FILE" ]] || {
  printf 'error: vulnerability exception file not found: %s\n' "$EXCEPTIONS_FILE" >&2
  exit 1
}

today="$(date -u +%F)"
jq -e --arg today "$today" '
  .schema_version == 1 and
  (.exceptions | type == "array") and
  (([.exceptions[].id] | length) == ([.exceptions[].id] | unique | length)) and
  all(.exceptions[];
    (.id | type == "string") and
    (.id | test("^(CVE-[0-9]{4}-[0-9]+|GHSA-[0-9A-Za-z-]+)$")) and
    (.component | type == "string") and (.component | length > 0) and
    (.reason | type == "string") and (.reason | length >= 20) and
    (.expires | type == "string") and
    (.expires | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) and
    (.expires >= $today)
  )
' "$EXCEPTIONS_FILE" >/dev/null || {
  printf 'error: vulnerability exceptions are malformed, duplicated or expired\n' >&2
  exit 1
}

ignore_file="$(mktemp /tmp/midorivpn-trivy-ignore.XXXXXX)"
cleanup() {
  rm -f -- "$ignore_file"
}
trap cleanup EXIT
jq -r '.exceptions[].id' "$EXCEPTIONS_FILE" >"$ignore_file"

mkdir -p -- "$(dirname -- "$report_path")"
report_dir="$(cd "$(dirname -- "$report_path")" && pwd -P)"
report_name="$(basename -- "$report_path")"
report_path="${report_dir}/${report_name}"
: >"$report_path"
rw_suffix=''
ro_suffix=':ro'
run_args=(run --rm "--pull=${TRIVY_PULL_POLICY}")
if [[ "$(basename -- "$CONTAINER_ENGINE")" == podman ]]; then
  rw_suffix=':z'
  ro_suffix=':ro,z'
fi
run_args+=(
  -e HOME=/tmp
  -e TRIVY_CACHE_DIR=/tmp/trivy-cache
  -v "$report_path:/reports/report.json${rw_suffix}"
  -v "$ignore_file:/config/.trivyignore${ro_suffix}"
)

scan_args=()
if [[ "$mode" == archive ]]; then
  [[ -f "$target" ]] || {
    printf 'error: OCI archive not found: %s\n' "$target" >&2
    exit 1
  }
  target_dir="$(cd "$(dirname -- "$target")" && pwd -P)"
  target_name="$(basename -- "$target")"
  target="${target_dir}/${target_name}"
  run_args+=(-v "$target:/scan/image.tar${ro_suffix}")
  scan_args=(image --input /scan/image.tar)
else
  [[ "$target" =~ @sha256:[0-9a-f]{64}$ ]] || {
    printf 'error: registry image must be pinned by sha256 digest\n' >&2
    exit 1
  }
  docker_config_dir="${DOCKER_CONFIG:-${HOME}/.docker}"
  if [[ -f "${docker_config_dir}/config.json" ]]; then
    run_args+=(-e DOCKER_CONFIG=/auth -v "$docker_config_dir:/auth${ro_suffix}")
  fi
  scan_args=(image "$target")
fi

"$CONTAINER_ENGINE" "${run_args[@]}" "$TRIVY_IMAGE" "${scan_args[@]}" \
  --scanners vuln \
  --severity HIGH,CRITICAL \
  --ignore-unfixed \
  --ignorefile /config/.trivyignore \
  --exit-code 1 \
  --format json \
  --output /reports/report.json

jq -e '
  .SchemaVersion == 2 and
  ([.Results[]?.Vulnerabilities[]?] | length == 0)
' "$report_path" >/dev/null

printf 'OCI vulnerability gate passed: %s\n' "$target"
