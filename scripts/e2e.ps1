# The end-to-end step of test-all. It starts the full stack under its own compose project and ports, runs the
# Playwright suite of e2e/ in a container on the stack's network, and always takes the stack down with its volume, also
# when a step fails, so every run starts from the seeds. It also runs alone: pwsh -File scripts/e2e.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$infra = Split-Path -Parent $PSScriptRoot
$project = if ($env:E2E_PROJECT) { $env:E2E_PROJECT } else { 'ofe-e2e' }
$runner = "$project-runner"
# Ports of its own, so this stack never clashes with one started by hand on 8080 and 8081.
$env:API_PORT = if ($env:E2E_API_PORT) { $env:E2E_API_PORT } else { '18080' }
$env:WEB_PORT = if ($env:E2E_WEB_PORT) { $env:E2E_WEB_PORT } else { '18081' }

Set-Location -LiteralPath $infra

function Invoke-Stack {
    docker compose --project-name $project --file compose.yaml @args
}

node e2e/check-playwright-version.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker build --tag $runner e2e
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$status = 1
try {
    Invoke-Stack up --build --detach --wait --wait-timeout 300
    $status = $LASTEXITCODE
    if ($status -eq 0) {
        docker run --rm --init --ipc=host --network "${project}_default" $runner
        $status = $LASTEXITCODE
    }
} finally {
    # Runs on every exit: shows the end of the stack's logs after a failure, then removes the stack and its volume.
    if ($status -ne 0) {
        Invoke-Stack logs --no-color --tail 40
    }
    Invoke-Stack down --volumes --remove-orphans
}
exit $status
