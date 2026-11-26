## Example layout

```
my-app/
├── ktr.kfg                     # Source of truth for installed layers
├── pnpm-workspace.yaml         # packages: ["apps/*", "packages/*"]
├── turbo.json                  # build, dev, test, typecheck pipelines
├── biome.json                  # Root formatter & linter
├── compose.yml                 # Local Postgres + Valkey parity
├── .env.example                # Merged env contract
├── apps/
│   ├── web/                    # [frontend] Astro or Vite React
│   ├── api/                    # [backend] Hono + @hono/node-server
│   │   └── src/
│   │       ├── index.ts        # User-owned; calls registerKtrRoutes(app)
│   │       └── ktr/routes.ts   # Managed barrel (auth, webhooks, billing, health)
│   └── worker/                 # [ops] BullMQ or pg-boss consumer
├── packages/
│   ├── shared/                 # [shared] Zod schemas & DTOs
│   ├── db/                     # [data] Kysely + PG / Valkey / Turso / R2
│   ├── auth/                   # [identity] BetterAuth + Kysely adapter + Turnstile
│   ├── billing/                # [commerce] BillingProvider DI + Creem/Polar + ledger
│   └── ops/                    # [ops] Pino logger, Postmark/Resend, Sentry/GlitchTip
└── infra/
    ├── docker/                 # Multi-stage Dockerfiles
    ├── kamal/                  # config/deploy.yml (if Kamal 2)
    └── backups/                # pg_dump + rclone -> Cloudflare R2 script
```

## Subcommands

| Command              | Behavior                                                                        | Key flags                        |
| :------------------- | :------------------------------------------------------------------------------ | :------------------------------- |
| npx ktr              | Auto-detects empty directory (init wizard) or existing ktr.kfg (expand wizard). | --dry-run, --yes, --from \<path> |
| npx ktr add \<layer> | Jumps directly to one layer (e.g. npx ktr add commerce) and resolves DAG deps.  | --dry-run, --no-install          |
| npx ktr status       | Reads ktr.kfg and prints active vs. dormant (none) layers.                      | --json                           |
| npx ktr doctor       | Verifies ktr.kfg matches installed packages, env vars, and Docker services.     | --fix                            |

### Test the full multi-year lifecycle in Vitest

Do not only unit-test the parser. Write an integration test that creates a temporary directory, runs ktr with frontend only, commits a fake user file in apps/web/src/custom.ts, re-runs ktr to add backend + postgres + valkey, and then runs a third time to add commerce (creem). Assert that custom.ts is untouched, ktr.kfg parses cleanly, and compose.yml contains both Postgres and Valkey.

### Local test & npm release

Before publishing, test locally with pnpm build && pnpm link --global and run ktr inside a scratch folder. When ready, publish to npm (or a scoped package like @yourhandle/ktr if the unscoped name is taken) using GitHub Actions with npm publish --provenance --access public. Anyone—including your future self—can then run npx ktr or pnpm dlx ktr with zero global installation.

## kfg format

`.kfg` is a custom config format.

- sections: `[section]` | `[section.subsection]`
- assignment: `key : value` (spaces around colon optional)
- inline comment: `; comment`
- block comment: `/; block comment ;/`
- base types: `number`, `version`, `array`, `string` (no quotes required), `bool`, date as `YYYY-MM-DD`

### Example ktr.kfg

```kfg
; ktr.kfg — managed by `npx ktr` (safe to edit; re-run `npx ktr` to sync)
[meta]
schema_version : 1
cli_version : 0.0.1
project_name : acme-app
package_manager : pnpm

[shared]
workspace : turborepo          ; turborepo | none
validation : zod               ; zod | none
quality : biome                ; biome | none
testing : [vitest, playwright] ; vitest, playwright | none

[frontend]
framework : astro              ; astro | vite-react | none
css : tailwind                 ; tailwind | none
state : nanostores             ; nanostores | none  (auto-adds @nanostores/react for vite-react)
data_fetching : tanstack-query ; tanstack-query | none
forms : astro-actions          ; astro-actions | react-hook-form | none

[backend]
framework : hono               ; hono | none  (includes @hono/zod-validator, hc, @hono/node-server)
sanitizer : sanitize-html      ; sanitize-html | none

[data]
database : postgres            ; postgres | none
kv : valkey                    ; valkey | none
edge : none                    ; turso | none
dal : kysely                   ; kysely | none
storage : r2                   ; r2 | none

[identity]
auth : better-auth             ; better-auth | none
bot_shield : turnstile         ; turnstile | none  (Cloudflare WAF + Turnstile + Hono/Valkey middleware)

[commerce]
mor : creem                    ; creem | polar | none
billing_di : true              ; true | false (BillingProvider DI interface)
entitlements : true            ; true | false (Kysely PG tables + Valkey cache)
webhooks : true                ; true | false (/webhooks, /billing + deduplication)
usage_ledger : false           ; true | false (Valkey atomic counter + PG ledger)

[ops]
queue : pg-boss                ; bullmq | pg-boss | none
email : resend                 ; postmark | resend | none
logging : pino                 ; pino | none
errors : sentry                ; sentry | glitchtip | none
uptime : betterstack           ; betterstack | uptime-kuma | none

[infra]
edge_network : cloudflare      ; cloudflare | none
containers : docker-compose    ; docker-compose | none
hosting : hetzner              ; hetzner | railway | fly | none
deploy : kamal2                ; kamal2 | coolify | dokploy | none
ci : github-actions            ; github-actions | none
secrets : infisical            ; infisical | doppler | none
backups : pg-dump-rclone-r2    ; pg-dump-rclone-r2 | none
```
