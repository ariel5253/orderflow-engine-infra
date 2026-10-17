# orderflow-engine-infra

[Español](README.es.md)

The full Orderflow Engine stack with Docker Compose (the database, the API and the web client, built from the sibling repositories), plus the workspace test command (`scripts/test-all`) that runs the API tests, the web tests, the end-to-end flow, the documentation check and the integrity check together.

## Status

Built by task T-01 of the task plan (`spec/TASKS.md` in the `orderflow-engine-docs` repository): `compose.yaml` starts the database and the API, and `scripts/test-all` runs every check of the workspace. T-17 adds the web client to the stack and its tests to `test-all`. T-19 makes Docker restart the stack and adds the end-to-end flow to `test-all`.

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
| Docker | running, for the stack, the API tests (Testcontainers), the web tests and the end-to-end flow (containers) |
| JDK | 21, for `test-all` |
| Node | 18 or later, for the documentation and integrity checks of `test-all` and the version check of the end-to-end flow. The web tests and the end-to-end flow bring their own Node in their containers |
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
3. `scripts/e2e.sh` in this repository (`scripts/e2e.ps1` in PowerShell): the end-to-end flow against the full stack (see "End-to-end flow" below)
4. `node orderflow-engine-tools/docs-check/check-docs.mjs`
5. `node orderflow-engine-tools/integrity/check-integrity.mjs`

It stops at the first failure with `test-all: FAIL (<step>, exit code <n>)` and that exit code. When every step passes, it ends with `test-all: OK (API verify, web tests, end-to-end, documentation check, integrity check)`.

## End-to-end flow

`e2e/` holds a Playwright suite that walks the whole flow in a browser against the real stack (PostgreSQL, the API and the web client): cart → quote → confirmation → order → My orders, once in Spanish and once in English. It picks products by SKU, never by name, because names are tenant data. After each confirmation it checks that the new order number comes first in My orders, with the same total the order screen showed, and that the order history (`GET /api/v1/orders?customerId=`), read through the client's origin, returns it first with the confirmed total. It clicks the labels of the client's own dictionaries, so it follows their wording, and it fails on any error in the browser console.

`scripts/e2e.sh` (`scripts/e2e.ps1` in PowerShell) runs it, also on its own:

1. `e2e/check-playwright-version.mjs` checks that `e2e/package.json` and the image of `e2e/Dockerfile` use the `playwright` version that `orderflow-engine-web` pins, so the flow runs on the browser build of the web tests
2. `docker build` makes the runner image from `e2e/Dockerfile`, on `mcr.microsoft.com/playwright:v<version>-noble`
3. `docker compose --project-name ofe-e2e up --build --detach --wait` starts the full stack with the API on port 18080 and the client on port 18081, so it never clashes with a stack started by hand on 8080 and 8081
4. the runner joins the stack's network and runs the suite against `http://web:8080`, once the API answers through the client
5. `docker compose --project-name ofe-e2e down --volumes --remove-orphans` always removes the stack and its database, also when a step fails, so every run starts from the seeds. After a failure, the end of the stack's logs is printed first

`E2E_PROJECT`, `E2E_API_PORT` and `E2E_WEB_PORT` change the project name and the two host ports. To run the suite from the host against a stack that is already up, from `e2e/`: `npm ci`, `npx playwright install chromium`, then `npx playwright test` with `E2E_BASE_URL=http://localhost:8081`.

## Documentation

- Specification: `spec/SPEC.md` in the `orderflow-engine-docs` repository
- Integrity rules: `governance/repository-integrity.md` in the `orderflow-engine-docs` repository
- Document map: `README.md` in the `orderflow-engine-docs` repository
