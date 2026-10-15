# The workspace test command. It runs, in order, the API build and tests, the documentation check and
# the integrity check, and stops at the first failure. The workspace root is two levels above this
# script, so the repositories must be cloned side by side (see README).
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
Invoke-Step -Name 'documentation check' -Directory '.' -Command { node orderflow-engine-tools/docs-check/check-docs.mjs }
Invoke-Step -Name 'integrity check' -Directory '.' -Command { node orderflow-engine-tools/integrity/check-integrity.mjs }

Write-Host 'test-all: OK (API verify, documentation check, integrity check)'
