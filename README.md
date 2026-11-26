# ktr

Idempotent E2E web stack scaffolder and expander backed by `ktr.kfg`.

## Usage

```bash
npx @kvzidev/ktr
pnpm dlx @kvzidev/ktr
```

### Commands

- `npx @kvzidev/ktr` — Auto-detects an empty directory (init wizard) or existing `ktr.kfg` (expand wizard). Flags: `--dry-run`, `--yes`, `--from <path>`, `--template <source>`, `--use-git`, `--no-install`.
  - `--template <source>` accepts a Git URL, `gh/owner/repo` (or `gh/owner/repo#branch`), or a local directory path containing a `ktr.kfg` starter project.
- `npx @kvzidev/ktr add <layer>` — Configure a single layer (`shared`, `frontend`, `backend`, `data`, `identity`, `commerce`, `ops`, `infra`) and resolve DAG dependencies. Flags: `--dry-run`, `--no-install`.
- `npx @kvzidev/ktr status` — Display active and dormant (`none`) layers from `ktr.kfg`. Flags: `--json`.
- `npx @kvzidev/ktr doctor` — Verify `ktr.kfg` matches installed workspaces, `.env.example`, and `compose.yml`. Flags: `--fix`.

## `.kfg` Format

- Sections: `[section]` or `[section.subsection]`
- Assignment: `key : value`
- Inline comment: `; comment`
- Block comment: `/; block comment ;/`
- Base types: `number`, `version`, `array`, `string`, `bool`, `date` (`YYYY-MM-DD`)
