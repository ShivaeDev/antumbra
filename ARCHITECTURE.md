# Architecture

Antumbra is a macOS desktop app (Electron) for long-horizon work with AI
agents. Early development: this document describes the intended shape; the
code is catching up to it.

## Process model

The main process owns everything durable — agent sessions, scheduling,
persistence, native surfaces (menus, tray, windows). The renderer is a pure
web app and a stateless projection: it holds no durable state, reaches main
only through one typed contract, and every window can reload at any moment
and rehydrate. Agents running in the main process never notice a renderer
reload.

Closing the app stops all local work by design. Recovery is
conversation-level: on relaunch, agent sessions resume from persisted state.

## Workspace

| Package                | Role                                                    |
| ---------------------- | ------------------------------------------------------- |
| `apps/desktop`         | Electron shell: windows, native surfaces, composition   |
| `packages/contract`    | The typed API surface between renderer and main (a leaf)|
| `packages/kernel`      | Intents, admission scheduling, lifecycle state machines |
| `packages/backends`    | Agent backend adapters (what drives a model session)    |
| `packages/runners`     | Where execution lives: local processes, git worktrees   |
| `packages/persistence` | SQLite behind Effect layers; owns all database access   |
| `packages/plugin-api`  | The capability registration surface                     |
| `packages/renderer`    | The web UI                                              |

Dependency direction is enforced by `dependency-cruiser` in CI; the rules
live in `.dependency-cruiser.cjs` and each carries its rationale.

## The kernel

Work enters the system as an intent: a durable, schema-validated record.
Submitting an intent never fails for system-state reasons — it is a write
that returns an id and an observable status stream. A scheduler decides
admission (concurrency, resource pressure, shutdown draining) and is the only
component that starts work. Intent lifecycles are explicit state machines
with transition tables.

## Plugins

Capabilities — agent backends, runners, integrations — register through the
plugin API. Built-in capabilities use the same registration path as external
plugins, so the API stays honest by construction.

## Quality

The stack is Effect-based TypeScript at maximum strictness. Mechanical
guards (file structure, code patterns, pragma registry, boundaries) run in
`pnpm lint` and are themselves covered by tests; judgment-level standards
live in `quality-gates/`. See `AGENTS.md` for the working conventions.
