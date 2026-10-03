# Antumbra

_an-TUM-bra_ — in eclipse geometry, the region beyond the tip of the umbra. From inside it, the blocking body appears entirely contained within the
disc of the light source: a ring of light around every obstacle. Nothing ahead outsizes the star.

Antumbra is a desktop app for long-horizon work with AI agents: a fixed north star, courses plotted leg by leg, agents that make way between fixes.

A place to stand for the long view.

## Status

Early development; there are no releases yet. The desktop app runs from source: `pnpm setup`, then `pnpm --filter @antumbra/desktop dev`. The Electron
shell starts a separate server and runner; its windows read the server over Effect RPC. In development it also logs a `browser:` line; open that
address in an ordinary browser tab to run the same window against the running server. CI packages a macOS build with
`pnpm --filter @antumbra/desktop package`.

## Development setup

Use Node 26.10.0 and pnpm 12.8.1. The root `packageManager` includes the registry integrity hash, and `.node-version` records the runtime. CI uses
these same pins.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @antumbra/desktop dev
```

`pnpm setup` is the idempotent frozen install. It prepares dependencies without build, lint, typecheck or test gates and preserves local settings and
journals. Assets, main/preload bundles, and the installed-version Electron binary are prepared by the development command. Electron 43 installs its
binary on demand; dependency installation alone does not download it. Antumbra persists its journals in SQLite; local setup needs no PostgreSQL
database.

The renderer uses `ANTUMBRA_RENDERER_PORT` (5183). The optional UI harness uses `ANTUMBRA_HARNESS_PORT` (5184): `pnpm --filter @antumbra/harness dev`.
Both Vite servers require their configured port instead of falling back to another project’s server. The desktop launches its server on a dynamically
assigned loopback port and passes the resulting address to the renderer. The logged `browser:` address opens the running app in an ordinary browser.

Run validation explicitly before handoff:

```sh
pnpm ready
pnpm build
pnpm typecheck
pnpm typecheck:compat
pnpm test
pnpm test:guards
```

Desktop development requires Electron’s platform libraries and a display server. Tests disable Node’s Web Storage globals so the DOM environment owns
storage. macOS packaging is a separate release task. There is no Playwright dependency or Chromium installation step in this repository; renderer
tests use its installed Vitest environment.

## Documentation

- [Design axioms](DESIGN.md) — the cross-context laws every design obeys.
- [Architecture](ARCHITECTURE.md) — the process, package, and dependency shape, and the reasoning behind it.
- [Glossary](GLOSSARY.md) — a short index of Antumbra's product language.
- [Design guides](docs/design/README.md) — the relationships, acts, and rationale behind that language.
- [Branding](docs/branding.md) — the wordmark, the dark palette, the type scale, and the copy register.

- [Dev journal](docs/contributing/dev-journal.md) — the durable fact store, its commands, and when a reset is the right move.
- [Dev tracing](docs/contributing/dev-tracing.md) — the trace database, what it records, and the queries to start from.
- [Running tests](docs/contributing/tests.md) — test commands and local worktree coordination.

## License

[MIT](LICENSE)
