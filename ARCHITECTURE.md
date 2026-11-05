# Architecture

Antumbra is a macOS desktop app for long-horizon work with AI agents. The application has three process owners: an Electron shell, a server, and a
runner. Windows are clients of the server. This document describes their responsibilities and package boundaries; [DESIGN.md](DESIGN.md) owns the
binding product axioms, and [intended work](docs/design/intended.md) records concepts that have not been built.

## Process model

The shell in `apps/desktop` selects the data directory, takes Electron's single-instance lock, starts and supervises the server and runner, and owns
native menus, tray, windows, links, and requested restart. Repeat launches reach the existing shell for that directory. Window roles, arrangement, and
drafts are shell state; losing a window does not lose domain work. Preload exposes the narrow shell bridge from `packages/platform/shell`.

The server in `apps/server` owns app-managed PostgreSQL, command execution, projected rows, live queries, and reconciliation. Its application
definition assembles domain services and projection stages; its runtime supervises domain reconcilers, Session operations, capacity release, resource
reclamation, mail delivery, Change observation, Ruling reconciliation, and smoothing. Each runs as a named loop in its own scope: a defect stops that
one loop, records it as a `LoopFailed` fact, and leaves the process, the RPC surface, and every other loop running. App Layers supply filesystem
custody, GitHub processes, and runner connections. The server hosts Effect RPC for commands, live queries, transcripts, content, lifecycle, and runner
transport.

The runner in `apps/runner` owns provider processes, live attachments, tool forwarding, Git work, and its durable event log. Its entry assembles the
Claude, Codex, OpenCode, and Pi adapters. Provider availability and configuration remain adapter concerns. Restarting a server does not transfer
provider ownership into it: the runner reconnects and sends entries after the server's committed log cursor.

Glass packages provide the web UI. They read server projections through live RPC queries and invoke declared commands; they do not reconstruct domain
truth from independent client caches. A screen is a narrow live query that the server re-pushes when a fact changes what that screen shows, which is
why the glass holds no truth of its own and a window that dies costs nothing. Transcript reads are sequenced. Native actions go through the shell
bridge. Reloading a window has no effect on an Agent or its runner attachment.

## Ownership

| Path                             | Responsibility                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `apps/desktop`                   | Shell entry, native adapters, child supervision, and packaging                                                                |
| `apps/server`                    | Feature and projection assembly, RPC handlers, reconcilers, tool handlers, external custody, and server adapters              |
| `apps/runner`                    | Runner entry, provider SDK and process adapters, filesystem and Git execution                                                 |
| `apps/testing`                   | Production application composition with test implementations of external services                                             |
| `packages/platform`              | Shared schemas, feature declarations, RPC and runner wire contracts, shell vocabulary, prompts, skills, and service utilities |
| `packages/server/storage`        | PostgreSQL event histories, migrations, typed repositories, and projections                                                   |
| `packages/server/legacy-fixture` | Versioned legacy journal decoding and fixture replay                                                                          |
| `packages/server/domains`        | Neutral feature schemas and RPC declarations                                                                                  |
| `packages/server/<domain>`       | SQL domain services, guards, queries, and business decisions                                                                  |
| `packages/server/edges`          | Neutral external-service adapters, including the GitHub Change host                                                           |
| `packages/runner/fabric`         | Session attachment, operation handling, and durable runner log                                                                |
| `packages/runner/ports`          | Backend capabilities and neutral delivery contracts                                                                           |
| `packages/runner/backends`       | Provider mapping and behavior over the runner ports                                                                           |
| `packages/runner/tools`          | Binding frozen tool descriptors into provider sessions                                                                        |
| `packages/runner/git`            | Git semantics over app-supplied machine capabilities                                                                          |
| `packages/glass`                 | Client, forms, shared components, feature screens, renderer, and harness                                                      |

Server domains include Agents, Sessions, lifecycle, settings, role settings, backend catalog, Voyages, Pieces, Boards, mail, Rulings, repositories,
Changes, Artifacts, Reports, inputs, costs, reclamation, and capacity. Each owns its specific vocabulary and invariants: every invariant has a feature
owner and every runtime effect has an app owner.

## Dependencies and effects

Dependencies point one way. Platform packages know no feature or process implementation. Server and runner packages stay within their process group
and platform. Glass may import a server domain's declared files. Server edges, runner Git, and runner ports are lower-level owners; backend packages
use runner ports and platform. App composition roots supply machine services and close Effect environments.

Every package exports explicit source subpaths through `{ "./*": "./src/*" }`; imports name the real file and extension. Runtime code uses Effect
services and Layers, typed failures, and Schema decoding at boundaries. A package does not hide a forbidden dependency behind an alias or a wrapper.
Node, network, filesystem, and child-process implementations live in apps, apart from the runner log and dev trace sink. Legacy SQLite access belongs
to fixture-only app adapters.

A feature declares its rows, facts, commands, and queries with the platform feature vocabulary. App assembly registers those declarations and the
ordered derived projection stages. Neighbor-owned contribution rows express the evidence a feature needs without a reverse service dependency; for
example Agents contribute resource eligibility and Changes contribute held Berths to reclamation.

Mechanical package, import, IO, and declaration rules live under `script/lint` and `script/boundaries`. Tests may depend on `@antumbra/app-testing` to
exercise production composition; production code never imports it.

## Durable truth and committed changes

The server starts an app-owned PostgreSQL cluster under `server/postgres` in its application data directory. The cluster listens on a private Unix
socket and has no TCP listener. `PostgresBinaries` supplies installed binaries through `hostPostgresBinaries`; `ANTUMBRA_POSTGRES_BIN_DIRECTORY`
selects an installed binary directory. PostgreSQL 18 or later is required. Missing or incompatible binaries stop startup with a typed error.
`migrateAppPostgres` takes a backup before applying current SQL migrations and keeps three backups.

Domain services append facts through `@shivaedev/events` and update their projections in the same PostgreSQL transaction. Guarded writes serialize
through one shared SQL writer. `@shivaedev/sql` publishes affected changes keys after commit; rollback publishes nothing. Live queries and
`@shivaedev/reconciler` consume those keys. Provider events remain in the runner log, while committed domain facts name the Session they describe.

The packaged application uses `Antumbra-SQL`; development uses `Antumbra-SQL-Dev`. A development override names a parent directory containing its own
`Antumbra-SQL-Dev` namespace. These fresh namespaces create new local credentials and runner-log identities. Production never opens a legacy journal
or imports its records. Archived journals are fixture evidence only: the versioned legacy decoder folds them in memory, then fixture tooling replays
them into an isolated PostgreSQL database. Fixture viewer writes remain in that database between restarts.

The runner log has a separate owner and sequence. A runner appends durable evidence locally before reporting it, and the server asserts nothing about
a Session it did not read there; that is what lets a runner outlive a server restart and lets a dead runner's Sessions still read from their last fact
instead of reading as ended. The server commits observed facts and the consumed cursor together, keyed by the log's identity, and numbered upgrades
preserve that identity and the entry cursors. The log uses SQLite's `user_version` to record completed upgrades. Its first upgrade retains existing
identity metadata and ensures the request index without replacing the entries table. The legacy DDL hash no longer triggers rollover. A pending
upgrade of an existing log takes a snapshot beside the file before applying the upgrade and version stamp in one transaction. Files predating stored
identity retain their configured log id. Previously retained rollover files remain separate logs with their own identities and cursors; reading one
requires its original configured id when the file predates stored identity. Transport replies acknowledge operations; they do not fabricate Session
completion. Image and Artifact bytes live in app-managed custody, while PostgreSQL rows hold their identity, ordering, and delivery or landing
evidence.

## Requests and reconciliation

Durable requests describe pending operations. Reconcilers compare rows with current external evidence, then call commands to record decisions and
runner operations to perform effects. They do not write rows directly or checkpoint an executing workflow. `@shivaedev/reconciler` owns startup,
change-key and due-time wakes, merges pending passes, and scopes keyed actions until their eligibility ends. Antumbra supplies reads, domain acts,
refusal timing, failure records and supervision. Runner reconnect refreshes the running loops; Change observation reports its next due time through
the same engine.

Starts use committed admission guards and observable waiting reasons. Piece demand survives an attempt, and provider capacity can hold an operation
until an explicit release or suitable evidence permits progress. Resource reclamation keeps committed claim exclusions and Change-backed holds; runner
Git evidence decides whether cleanup is safe. Dirty or uncertain resources do not become disposable merely through age.

An operation has an issuer-minted request id. Reconnection may repeat that operation and receive its existing result. A new authorized attempt gets a
new id. The [runner RPC schema](packages/platform/runner/src/rpc.ts) declares the protocol; the [append handler](apps/server/src/runner/append.ts)
commits observed facts and their cursor.

## Sessions, tools, and recovery

An Agent is a durable responsibility; a Session carries execution identity beneath it. The runner owns live provider handles and native identity
evidence. The server derives its Session readings from the log. A missing attachment does not mean the Session ended, and starting a process does not
itself authorize resuming work.

Wake, delivery, drain, and close are explicit operations. Requested restart records the relevant roots through lifecycle commands before drain and
consumes that record before requesting their wakes. Abandoning restart clears the record. Ordinary boot does not invent a wake for every recorded
Session. The [recovery guide](docs/design/agent-recovery.md) owns the product distinctions among rest, stranding, closure, and retirement.

Tool schemas and handlers are assembled on the server. Opening a Session binds its descriptors and tool-set version. The runner adapts those data
descriptors to the provider and forwards calls with the trusted Session identity and stable call id. It logs tool invocation and answer evidence.
Historical handler-version hosting and staged server swaps are not built.

## Validation

Feature behavior is tested through the production application with scripted external boundaries. Glass tests exercise the same server definition; app
tests own process, filesystem, provider, and transport integration. Pure schema and storage primitive stories remain with their owners. The
[testing guide](docs/contributing/tests.md) lists commands and local test serialization.

Run `pnpm ready` for the repository gates. The [quality routes](quality-gates/README.md) cover judgments that an import graph or passing test cannot
make.
