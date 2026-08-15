# Architecture

Antumbra is a macOS desktop app (Electron) for long-horizon work with AI
agents. Early development: this document describes the intended shape; the
code is catching up to it.

## Process model

The main process owns orchestration, scheduling, and native surfaces (menus,
tray, windows); persistence owns durable truth. Process memory contains only
things that may disappear at exit, such as fibers, handles, subscriptions,
semaphores, timers, and local indexes. The renderer is a pure web app and a
stateless projection: it holds no durable state, reaches main only through one
typed contract, and every window can reload at any moment and rehydrate.
Agents running in the main process never notice a renderer reload.

Closing the app stops local execution, not durable work. Graceful shutdown
drains active and pending work to idle; forced shutdown never invents
completion. On relaunch, active, pending, or uncertain sessions resume from
persisted truth using the same Antumbra and provider-native session identities,
while idle sessions remain detached until needed. See
[`docs/design/agent-recovery.md`](docs/design/agent-recovery.md).

## Workspace

| Package                   | Role                                                            |
| ------------------------- | --------------------------------------------------------------- |
| `apps/desktop`            | Electron shell: windows, native surfaces, composition           |
| `packages/contract`       | The typed API surface between renderer and main (a leaf)        |
| `packages/session-events` | The neutral session-event vocabulary every side speaks (a leaf) |
| `packages/plugin-api`     | The driven ports: agent backends, runners, plugin registration  |
| `packages/agent-tools`    | The tools agents act through: schemas and binding, no transport |
| `packages/kernel`         | Intents, admission scheduling, lifecycle state machines         |
| `packages/domain`         | Agent use cases and the projections the contract serves         |
| `packages/git`            | Semantic Git operations over Effect's child-process port        |
| `packages/backend-claude` | The Claude agent backend: one adapter for one provider          |
| `packages/backend-codex`  | The Codex agent backend: one app-server child, threads on it    |
| `packages/runner-local`   | The local runner: processes and git worktrees on this machine   |
| `packages/persistence`    | SQLite behind Effect layers; owns all database access           |
| `packages/renderer`       | The web UI                                                      |

## Layers

The workspace is hexagonal, and the direction is the point. The vocabulary
and the contract are leaves: they import nothing and everyone may speak
them. `plugin-api` declares the driven ports — what an agent backend or a
runner must be, and what a tool an agent may call is. `agent-tools` sits
just above it and holds the tool specifications themselves — schemas and
binding, no transport — so the domain writes the handlers while every
adapter maps the same set onto its provider, and neither learns the other.
`domain` holds the use cases and depends only on ports, so it can name what
it needs without naming who provides it. Adapter packages
(`backend-*`, `runner-*`) implement a port for exactly one provider and
never reach back into the domain. `apps/desktop` is the composition root and
the only place where an adapter and a use case appear together.
`packages/git` is process infrastructure below `runner-local`; it speaks only
Effect's child-process port and never imports an Antumbra layer.

Dependency direction is enforced by `dependency-cruiser` in CI; the rules
live in `.dependency-cruiser.cjs` and each carries its rationale.
`quality-gates/package-architecture.md` covers the judgment the rules cannot
make.

## The kernel

Work enters the system as an intent: a durable, schema-validated record.
Submitting an intent never fails for system-state reasons — it is a write
that returns an id and an observable status stream. A scheduler decides
admission (concurrency, resource pressure, shutdown draining) and is the only
component that starts work. Intent lifecycles are explicit state machines
with transition tables.

Each admitted intent attempt builds a fresh `WorkflowEngine.layerMemory`,
registers its kind, and discards the engine and its history when the attempt
settles. The durable intent id is its deterministic execution identity, while
the per-execution `IntentExecution` service provides replay semantics for stable,
named activities within an attempt. Retried or reclaimed attempts begin again,
so activities
must be idempotent or reconcile durable domain truth. The version-sensitive
Effect 4 RC workflow API stays inside the kernel; the domain depends only on
`IntentExecution`.

## Plugins

Capabilities — agent backends, runners, integrations — register through the
plugin API. Built-in capabilities use the same registration path as external
plugins, so the API stays honest by construction.

## Quality

The stack is Effect-based TypeScript at maximum strictness. Mechanical
guards (file structure, code patterns, pragma registry, boundaries) run in
`pnpm lint` and are themselves covered by tests; judgment-level standards
live in `quality-gates/`. See `AGENTS.md` for the working conventions and
`DESIGN.md` for the design axioms every new concept must satisfy.
