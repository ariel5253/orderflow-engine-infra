# orderflow-engine-infra

[Español](README.es.md)

The full Orderflow Engine stack with Docker Compose (the database and the API, built from the sibling repositories), plus the workspace test command (`scripts/test-all`) that runs the API tests, the documentation check and the integrity check together.

## Status

Built by task T-01 of the task plan (`spec/TASKS.md` in the `orderflow-engine-docs` repository): `compose.yaml` starts the database and the API, and `scripts/test-all` runs every check of the workspace. The web screen joins the stack, and its tests join `test-all`, in T-17.

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

`docker compose` needs only `orderflow-engine-api` beside this repository. `test-all` needs all six, because the documentation check reads every repository. `orderflow-engine-api` also runs alone with its own `compose.yaml`, and `orderflow-engine-web` gets its own in T-17. Configuration keys are listed in `.env.example`. `.env` is never committed.

## How to run

| Need | Version |
|------|---------|
| Docker | running, for the stack and for the API tests (Testcontainers) |
| JDK | 21, for `test-all` |
| Node | 18 or later, for `test-all` |
| PowerShell | 7 (`pwsh`), only for `test-all.ps1` on Windows |

Start the full stack from this repository, with the siblings cloned as shown above:

```bash
docker compose up --build
```

Compose builds the API image from `../orderflow-engine-api` and starts PostgreSQL first. The API starts once the database is healthy. Health: `http://localhost:8080/actuator/health`. `docker compose down` stops the stack, and `docker compose down -v` also deletes the database volume.

Configuration comes from environment variables. `.env.example` lists every key with a comment, and its values are the defaults, so the stack starts without a `.env`. Copy it to `.env` only to change a value. For example, `API_PORT` moves the API port inside the container and on the host. The stack of `orderflow-engine-api` publishes the same port, so run one stack at a time or give one of them another `API_PORT`.

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
2. `node orderflow-engine-tools/docs-check/check-docs.mjs`
3. `node orderflow-engine-tools/integrity/check-integrity.mjs`

It stops at the first failure with `test-all: FAIL (<step>, exit code <n>)` and that exit code. When every step passes, it ends with `test-all: OK (API verify, documentation check, integrity check)`.

## Documentation

- Specification: `spec/SPEC.md` in the `orderflow-engine-docs` repository
- Integrity rules: `governance/repository-integrity.md` in the `orderflow-engine-docs` repository
- Document map: `README.md` in the `orderflow-engine-docs` repository
