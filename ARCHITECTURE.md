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

Exactly one Antumbra desktop process owns the application and its selected
local data directory at a time. Repeat launches are routed to that owner,
which opens or focuses windows in its process; windows never create independent
orchestration or persistence owners. The shell takes Electron's native
application lock before configuring data or constructing runtime and
persistence Layers.

Explicitly addressed mail is persisted as an immutable entry on the
addressee's Agent Board; its marked-read receipt is separate durable truth, so
a read never clears it. Raw Change and Review observations remain in their own
records. No mailbox feed, settling timer, presentation cap, or observation
hook turns those facts into mail or resumes an Agent; v1 attention is pulled
only after human selection.

Closing the app stops local execution, not durable work. Graceful shutdown
asks attached executive work to reach a safe quiescent boundary; forced
shutdown never invents completion. On relaunch, durable executive obligations
that may remain unfinished resume from persisted truth using the same Antumbra
and provider-native session identities. Machinery with no outstanding
obligation remains detached until needed. See
[`docs/design/agent-recovery.md`](docs/design/agent-recovery.md).

## Workspace

| Package                   | Role                                                            |
| ------------------------- | --------------------------------------------------------------- |
| `apps/desktop`            | Electron shell: windows, native surfaces, composition           |
| `packages/contract`       | Public typed IDL between renderer and main                      |
| `packages/vocabulary`     | Neutral Agent runtime, Board, Change, and Session-event language through explicit subject subpaths (a leaf) |
| `packages/session-event-journal` | Durable Session event sequencing and native identity correlation |
| `packages/plugin-api`     | The driven ports: agent backends, runners, plugin registration  |
| `packages/agent-tools`    | The tools agents act through: schemas and binding, no transport |
| `packages/service-definition` | Effect-only inferred service definitions and their single Layer |
| `packages/kernel`         | Intents, admission scheduling, lifecycle state machines         |
| `packages/intent-demand`  | Recreates missing mortal Intents from closed durable-demand registrations |
| `packages/domain-feeds`   | Shared post-commit domain change notifications                  |
| `packages/resource-reclamation` | Replaceable-resource claims, guards, Runner cleanup, and recovery |
| `packages/changes`       | Durable Change identity, submission, host reconciliation, and readiness |
| `packages/repos`          | Application repository registry and transactional lifecycle     |
| `packages/pieces`         | Piece acts and their transactional graph invariants             |
| `packages/boards`         | Board and mailbox storage invariants                            |
| `packages/artifacts`      | Durable artifact publication and landing                        |
| `packages/reports`        | Durable report landing                                           |
| `packages/domain`         | Application-facing use cases and capability Layer composition   |
| `packages/git`            | Semantic Git operations over Effect's child-process port        |
| `packages/github`         | GitHub change-host adapter: pull requests through `gh`           |
| `packages/backend-claude` | The Claude agent backend: one adapter for one provider          |
| `packages/backend-codex`  | The Codex agent backend: one app-server child, threads on it    |
| `packages/runner-local`   | The local runner: processes and git worktrees on this machine   |
| `packages/persistence`    | SQLite behind Effect layers; owns all database access           |
| `packages/renderer`       | The web UI                                                      |

## Layers

The workspace is hexagonal, and dependency direction is the point. The
Effect-only `vocabulary` leaf exposes explicit subject subpaths and no generic
root barrel. `contract` is the public IDL layer and may depend on that lower
leaf, but never on a capability, port, adapter, domain, or app layer.
`plugin-api` declares driven ports; `agent-tools` defines transport-free tools.
Capability packages own business acts beneath the application-facing `domain`
facade, while adapters implement ports without importing the domain.

`apps/desktop` is the only composition root where adapters and use cases meet.
Effect environments state runtime dependencies, capability services own their
transactions and post-commit signals, and Layers select implementations and
lifetimes. Foreign callbacks cross adapter boundaries only after their Effect
requirements are closed. `packages/git` remains process infrastructure beneath
`runner-local`.

`service-definition` is the Effect-only construction leaf for services whose
operations and Layer come from one definition. Declared requirements are
captured once per Layer instance, and direct operations cannot name services
outside that one declaration. Stateful definitions construct their operation
record once in the Layer scope; their explicitly typed generic callback
requirements remain caller-owned. Direct generic or overloaded operation
records are rejected rather than silently widened.

`intent-demand` is the process-lifetime bridge between capability-owned durable
demand and Kernel-owned mortal Intents. Capabilities close typed discovery
registrations before handing them down; the bridge imports only Kernel and
Effect, performs an initial pass before runtime readiness, and repeats on wake
or bounded patience without owning business truth or durable checkpoints.

`resource-reclamation` owns the whole lifecycle of replaceable-resource claims:
selection, transactional guards and claim creation, Runner cleanup, durable
settlement, restart recovery, and the mortal reconcile loop. `changes` owns the
whole durable Change aggregate and supplies Change-backed held-resource evidence
through an ambient-transaction read; Domain composes the two capabilities.
Resource reclamation never imports Change truth, Domain, applications, or
providers.

Package manifests and exports are the source of truth for ordinary workspace
edges. `dependency-cruiser` independently rejects architectural edges that a
declared dependency must not make legal; its runner also fails when it cannot
inspect every workspace source. Authors declare each rule and its rationale
through the fluent policy in `script/boundaries/policy/`; the compiler alone
owns dependency-cruiser selectors and causal fixtures. The generated config
entry is `.dependency-cruiser.mjs`. The
[package-architecture](quality-gates/package-architecture.md) and
[Effect-services](quality-gates/effect-services.md) gates cover responsibility,
composition, and lifetime judgments an import graph cannot make.

## The kernel

Work enters the system as an intent: a durable, schema-validated record.
Submitting an intent never fails for system-state reasons — it is a write
that returns an id and an observable status stream. A scheduler decides
admission (concurrency, resource pressure, shutdown draining) and is the only
component that starts work. Intent lifecycles are explicit state machines
with transition tables.

An Intent is a mortal executable attempt, not durable Piece demand. A desired
Piece that is dependency-blocked has no dispatch workflow; reconciliation
submits a new Intent when it becomes eligible. Waiting is reserved for an
admitted attempt that needs immediate external intervention, such as
authentication.

Execution history lives only for one admitted attempt. Retried or reclaimed
attempts begin again, so every step is idempotent or reconciles durable domain
truth. See the [durable-recovery gate](quality-gates/durable-recovery.md) for
the binding review criteria.

## Plugins

Capabilities — agent backends, runners, integrations — register through the
plugin API. Built-in capabilities use the same registration path as external
plugins, so the API stays honest by construction.

## Quality

Mechanical guards run in `pnpm ready`; judgment-level standards are routed by
`quality-gates/README.md`. `DESIGN.md` contains the binding design axioms.
