#!/usr/bin/env bash
# The end-to-end step of test-all. It starts the full stack under its own compose project and ports, runs the
# Playwright suite of e2e/ in a container on the stack's network, and always takes the stack down with its volume, also
# when a step fails, so every run starts from the seeds. It also runs alone: bash scripts/e2e.sh
set -uo pipefail

infra="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
project="${E2E_PROJECT:-ofe-e2e}"
runner="${project}-runner"
# Ports of its own, so this stack never clashes with one started by hand on 8080 and 8081.
export API_PORT="${E2E_API_PORT:-18080}" WEB_PORT="${E2E_WEB_PORT:-18081}"

cd -- "${infra}" || exit 1

stack() {
  docker compose --project-name "${project}" --file compose.yaml "$@"
}

# Runs on every exit: shows the end of the stack's logs after a failure, then removes the stack and its volume.
stop_stack() {
  local status=$?
  if [ "${status}" -ne 0 ]; then
    stack logs --no-color --tail 40
  fi
  stack down --volumes --remove-orphans
  exit "${status}"
}

node e2e/check-playwright-version.mjs || exit $?
docker build --tag "${runner}" e2e || exit $?

trap stop_stack EXIT
stack up --build --detach --wait --wait-timeout 300 || exit $?
docker run --rm --init --ipc=host --network "${project}_default" "${runner}"
