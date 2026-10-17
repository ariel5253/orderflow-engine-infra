#!/usr/bin/env bash
# The workspace test command. It runs, in order, the API build and tests, the web tests in their
# container, the end-to-end flow against the full stack, the documentation check and the integrity check,
# and stops at the first failure. The workspace root is two levels above this script, so the repositories
# must be cloned side by side (see README).
set -uo pipefail

workspace="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"

# Runs one step inside a folder of the workspace and stops the whole run when it fails.
run_step() {
  local name="$1" directory="$2"
  shift 2
  echo "test-all: ${name}"
  (cd -- "${workspace}/${directory}" && "$@")
  local status=$?
  if [ "${status}" -ne 0 ]; then
    echo "test-all: FAIL (${name}, exit code ${status})" >&2
    exit "${status}"
  fi
}

run_step "API verify" orderflow-engine-api ./mvnw verify
# The test stage of the web Dockerfile runs the specs in headless Chromium, so the host needs no Node for them.
run_step "web tests" orderflow-engine-web docker build --target test .
# The whole flow through the browser against the full stack, which it starts and always takes down.
run_step "end-to-end" orderflow-engine-infra bash scripts/e2e.sh
run_step "documentation check" . node orderflow-engine-tools/docs-check/check-docs.mjs
run_step "integrity check" . node orderflow-engine-tools/integrity/check-integrity.mjs

echo "test-all: OK (API verify, web tests, end-to-end, documentation check, integrity check)"
