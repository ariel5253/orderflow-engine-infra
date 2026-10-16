# orderflow-engine-infra

[Español](README.es.md)

The full Orderflow Engine stack with Docker Compose (the database, the API and the web client, built from the sibling repositories), plus the workspace test command (`scripts/test-all`) that runs the API tests, the web tests, the documentation check and the integrity check together.

## Status

Built by task T-01 of the task plan (`spec/TASKS.md` in the `orderflow-engine-docs` repository): `compose.yaml` starts the database and the API, and `scripts/test-all` runs every check of the workspace. T-17 adds the web client to the stack and its tests to `test-all`. T-19 makes Docker restart the stack.

## Clone layout

This is the only repository that references its siblings, because it orchestrates them. Clone the repositories side by side:

```text
workspace/
├── orderflow-engine-api/
├── orderflow-engine-web/
├── orderflow-engine-infra/   ← run docker compose here
├── orderflow-engine-docs/
├── orderflow-engine-tools/
└── orderflow-engine-app/
```

`docker compose` needs only `orderflow-engine-api` and `orderflow-engine-web` beside this repository. `test-all` needs all six, because the documentation check reads every repository. `orderflow-engine-api` and `orderflow-engine-web` also run alone, each with its own `compose.yaml`. Configuration keys are listed in `.env.example`. `.env` is never committed.

## How to run

| Need | Version |
|------|---------|
| Docker | running, for the stack, the API tests (Testcontainers) and the web tests (a container) |
| JDK | 21, for `test-all` |
| Node | 18 or later, for the documentation and integrity checks of `test-all`. The web tests bring their own Node in their container |
| PowerShell | 7 (`pwsh`), only for `test-all.ps1` on Windows |

Start the full stack from this repository, with the siblings cloned as shown above:

```bash
docker compose up --build
```

Compose builds the API image from `../orderflow-engine-api` and the web image from `../orderflow-engine-web`, and starts PostgreSQL first. The API starts once the database is healthy, and the web client starts after the API. Open the client at `http://localhost:8081`. Its nginx serves the client and forwards `/api/` to the API on the compose network (`API_UPSTREAM` follows `API_PORT`), so the browser sees one origin and the API needs no CORS. API health: `http://localhost:8080/actuator/health`, on the API port only, since the client's origin does not forward `/actuator`. `docker compose down` stops the stack, and `docker compose down -v` also deletes the database volume.

Every service has `restart: unless-stopped`: Docker starts a service again when it exits, and starts the stack again when the Docker daemon starts (after a reboot, for example). A service stopped by hand, with `docker compose stop` or `docker compose down`, stays stopped.

Configuration comes from environment variables. `.env.example` lists every key with a comment, and its values are the defaults, so the stack starts without a `.env`. Copy it to `.env` only to change a value. For example, `API_PORT` moves the API port inside the container and on the host, and `WEB_PORT` moves the client's port on the host. The stacks of `orderflow-engine-api` and `orderflow-engine-web` publish the same ports, so run one stack at a time or give one of them another `API_PORT` or `WEB_PORT`.

Run every test of the workspace from this repository, with bash (Linux, macOS, Git Bash):

```bash
bash scripts/test-all.sh
```

or with PowerShell on Windows:

```powershell
pwsh -File scripts/test-all.ps1
```

`test-all` finds the workspace root two levels above the script, so it also runs from any other folder by its path. It runs, in order:

1. `./mvnw verify` in `orderflow-engine-api` (`mvnw.cmd verify` in PowerShell)
2. `docker build --target test .` in `orderflow-engine-web`: the web tests in the test stage of its `Dockerfile` (the literal-text check, then every spec in headless Chromium), so the host needs no Node for them. A failing spec fails the build
3. `node orderflow-engine-tools/docs-check/check-docs.mjs`
4. `node orderflow-engine-tools/integrity/check-integrity.mjs`

It stops at the first failure with `test-all: FAIL (<step>, exit code <n>)` and that exit code. When every step passes, it ends with `test-all: OK (API verify, web tests, documentation check, integrity check)`.

## Documentation

- Specification: `spec/SPEC.md` in the `orderflow-engine-docs` repository
- Integrity rules: `governance/repository-integrity.md` in the `orderflow-engine-docs` repository
- Document map: `README.md` in the `orderflow-engine-docs` repository
