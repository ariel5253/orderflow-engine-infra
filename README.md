# orderflow-engine-infra

[Español](README.es.md)

The full Orderflow Engine stack with Docker Compose (database, API and, once built, the web screen), plus the workspace test command (`scripts/test-all`) that runs the API tests, the web tests, the documentation check and the integrity check together.

## Status

Planned. It is built by task T-01 of the task plan (`spec/TASKS.md` in the `orderflow-engine-docs` repository), and the web screen joins it in T-17.

## Clone layout

This is the only repository that references its siblings, because it orchestrates them. Clone the repositories side by side:

```text
workspace/
├── orderflow-engine-api/
├── orderflow-engine-web/
├── orderflow-engine-infra/   ← run docker compose here
├── orderflow-engine-docs/
└── orderflow-engine-tools/
```

Each other repository also runs alone with its own `compose.yaml`. Configuration keys are listed in `.env.example`. `.env` is never committed.

## Documentation

- Specification: `spec/SPEC.md` in the `orderflow-engine-docs` repository
- Integrity rules: `governance/repository-integrity.md` in the `orderflow-engine-docs` repository
- Document map: `README.md` in the `orderflow-engine-docs` repository
