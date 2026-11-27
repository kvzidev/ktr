# ktr

**Kev Tec Red (`ktr`)** is an idempotent end-to-end web stack scaffolder and expander backed by `ktr.kfg`.

Start with a minimal project (or an existing template) and expand layers over time without overwriting your custom code.

## Quick Start

```bash
npx @kvzidev/ktr
# or
pnpm dlx @kvzidev/ktr
```

Requires **Node.js >= 22** and **pnpm >= 9**.

> [!WARNING]
> Not tested.
> This project is under development.
> Feel free to reach out and propose changes.

## How It Works

- **Idempotent sync**: User files are only written if missing. `package.json`, `compose.yml`, and `.env.example` are merged non-destructively.
- **Managed barrels**: `apps/api/src/ktr/routes.ts` and `packages/db/src/ktr/tables.ts` are regenerated from `ktr.kfg` on every sync.
- **DAG dependency resolution**: Selecting a module automatically enables and orders its prerequisites (for example, `better-auth` enables `hono`, `postgres`, and `kysely`).

## Commands

| Command           | Behavior                                                                                                                         | Flags                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ktr`             | Empty dir: init wizard. Existing `ktr.kfg`: expand wizard.                                                                       | `--dry-run`, `--yes`, `--from <path>`, `--template <source>`, `--use-git`, `--no-install` |
| `ktr add <layer>` | Configure a single layer (`shared`, `frontend`, `backend`, `data`, `identity`, `commerce`, `ops`, `infra`) and resolve DAG deps. | `--dry-run`, `--no-install`, `--yes`                                                      |
| `ktr status`      | Show active and dormant (`none`) layers from `ktr.kfg`.                                                                          | `--json`                                                                                  |
| `ktr doctor`      | Verify `ktr.kfg` matches workspaces, `.env.example`, and `compose.yml` services/volumes.                                         | `--fix`, `--no-install`                                                                   |

### Template Bootstrapping

`--template <source>` accepts:

- Built-in starters: `ktr/vps-api`, `ktr/vps-app`, `ktr/vps-spa`
- GitHub shorthand: `gh/owner/repo` or `gh/owner/repo#branch`
- Git URL: `https://...`, `ssh://...`, `git@...`
- Local directory path containing a `ktr.kfg` starter project

## Starting Shapes

When initializing a new project, the wizard offers:

- **Frontend only**: Minimal frontend and workspace setup; expand backend later.
- **API / Backend only**: Backend and data setup; expand frontend later.
- **VPS self-hosted**: Zero-prompt self-hosted preset (asks `API / Backend only` or `Full E2E stack`) configured for Docker-based VPS deployment without external SaaS dependencies.
- **Full E2E stack**: Interactive walk through all 8 layers.
- **Custom layer selection**: Pick specific layers to configure.

## Layers

`ktr` organizes a project into 8 layers (run `npx @kvzidev/ktr` or `npx @kvzidev/ktr add <layer>` to see available options):

- `shared` — Workspace manager, validation, formatter/linter, and test runners
- `frontend` — Web app framework, CSS, client state, data fetching, and forms (`apps/web`)
- `backend` — API framework and sanitizer (`apps/api`)
- `data` — Primary database, KV/cache, edge DB, DAL, and object storage (`packages/db`)
- `identity` — Authentication and bot protection (`packages/auth`)
- `commerce` — Merchant of Record, billing DI, entitlements, webhooks, and usage ledger (`packages/billing`)
- `ops` — Background queues, email, logging, error tracking, and uptime (`apps/worker`, `packages/ops`)
- `infra` — Edge network, containers, hosting, deploy tool, CI, secrets, and backups (`infra/`, `.github/`)

## Generated Monorepo Layout

```text
my-app/
├── ktr.kfg                     # Source of truth for installed layers
├── pnpm-workspace.yaml         # Workspace packages
├── turbo.json                  # build, dev, test, typecheck pipelines
├── biome.json                  # Formatter & linter
├── compose.yml                 # Local Postgres + Valkey parity
├── .env.example                # Merged environment contract
├── apps/
│   ├── web/                    # [frontend] Astro or Vite React
│   ├── api/                    # [backend] Hono + @hono/node-server
│   └── worker/                 # [ops] pg-boss or BullMQ consumer
├── packages/
│   ├── shared/                 # [shared] Zod schemas & DTOs
│   ├── db/                     # [data] Kysely + PG / Valkey / Turso / R2
│   ├── auth/                   # [identity] Better Auth + Turnstile
│   ├── billing/                # [commerce] BillingProvider DI + Creem / Polar
│   └── ops/                    # [ops] Pino, Resend/Postmark, Sentry/GlitchTip
└── infra/
    ├── docker/                 # Dockerfile
    ├── kamal/                  # Kamal 2 deploy.yml
    └── backups/                # pg_dump + rclone -> R2 script
```

## `.kfg` Format

- Sections: `[section]` or `[section.subsection]`
- Assignment: `key : value`
- Inline comment: `; comment`
- Block comment: `/; block comment ;/`
- Base types: `number`, `version`, `array`, `string`, `bool`, `date` (`YYYY-MM-DD`)

```kfg
[meta]
schema_version : 1
cli_version : 0.0.3
project_name : my-app
package_manager : pnpm

[shared]
workspace : turborepo
validation : zod
quality : biome
testing : [vitest]

[backend]
framework : hono
sanitizer : sanitize-html

[data]
database : postgres
kv : valkey
edge : none
dal : kysely
storage : none
```
