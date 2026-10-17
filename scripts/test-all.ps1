# The workspace test command. It runs, in order, the API build and tests, the web tests in their
# container, the end-to-end flow against the full stack, the documentation check and the integrity check,
# and stops at the first failure. The workspace root is two levels above this script, so the repositories
# must be cloned side by side (see README).
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspace = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Runs one step inside a folder of the workspace and stops the whole run when it fails. A step that
# cannot start (missing folder or command) fails with exit code 1.
function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)] [string] $Name,
        [Parameter(Mandatory = $true)] [string] $Directory,
        [Parameter(Mandatory = $true)] [scriptblock] $Command
    )
    Write-Host "test-all: $Name"
    $status = 1
    try {
        Push-Location -LiteralPath (Join-Path $workspace $Directory)
        try {
            & $Command
            $status = $LASTEXITCODE
        } finally {
            Pop-Location
        }
    } catch {
        [Console]::Error.WriteLine($_.Exception.Message)
    }
    if ($status -ne 0) {
        [Console]::Error.WriteLine("test-all: FAIL ($Name, exit code $status)")
        exit $status
    }
}

Invoke-Step -Name 'API verify' -Directory 'orderflow-engine-api' -Command { .\mvnw.cmd verify }
# The test stage of the web Dockerfile runs the specs in headless Chromium, so the host needs no Node for them.
Invoke-Step -Name 'web tests' -Directory 'orderflow-engine-web' -Command { docker build --target test . }
# The whole flow through the browser against the full stack, which it starts and always takes down.
Invoke-Step -Name 'end-to-end' -Directory 'orderflow-engine-infra' -Command { pwsh -NoProfile -File scripts/e2e.ps1 }
Invoke-Step -Name 'documentation check' -Directory '.' -Command { node orderflow-engine-tools/docs-check/check-docs.mjs }
Invoke-Step -Name 'integrity check' -Directory '.' -Command { node orderflow-engine-tools/integrity/check-integrity.mjs }

Write-Host 'test-all: OK (API verify, web tests, end-to-end, documentation check, integrity check)'
