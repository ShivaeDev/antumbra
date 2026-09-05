# Antumbra

_an-TUM-bra_ — in eclipse geometry, the region beyond the tip of the umbra. From inside it, the blocking body appears entirely contained within the
disc of the light source: a ring of light around every obstacle. Nothing ahead outsizes the star.

Antumbra is a desktop app for long-horizon work with AI agents: a fixed north star, courses plotted leg by leg, agents that make way between fixes.

A place to stand for the long view.

## Status

Early development; there are no releases yet. The desktop app runs from source: `pnpm install`, then `pnpm --filter @antumbra/desktop dev`. CI
packages a macOS build with `pnpm --filter @antumbra/desktop package`.

## Documentation

- [Design axioms](DESIGN.md) — the cross-context laws every design obeys.
- [Architecture](ARCHITECTURE.md) — the process, package, and dependency shape.
- [Glossary](GLOSSARY.md) — a short index of Antumbra's product language.
- [Design guides](docs/design/README.md) — the relationships, acts, and rationale behind that language.
- [Branding](docs/branding.md) — the wordmark, the dark palette, the type scale, and the copy register.

- [Running tests](docs/contributing/tests.md) — test commands and local worktree coordination.

## License

[MIT](LICENSE)
