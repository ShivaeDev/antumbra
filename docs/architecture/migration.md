# Migration to the North Star

[The North Star](north-star.md) · [Architecture today](../../ARCHITECTURE.md)

The app ships every day while it moves. The old and the new coexist behind one UI until the last feature has moved, and every pull request that moves
something updates this file in the same change. A status here is one of three words: not started, in progress, landed.

## Rules of the road

- **One feature per pull request.** A feature moves whole: its facts, its projection, its commands, its screen. The same change deletes the Prisma
  model and the tRPC router it replaces. Nothing is ported half-way and nothing is kept "for now".
- **The old code is not improved.** A feature that has not moved keeps its current shape; effort goes into moving it, not into making it nicer where
  it stands.
- **The runner split lands with the first session-bearing feature**, because the runner's log and the tailer are what that feature needs. Until then
  sessions stay in the main process.
- **Prisma, tRPC, and their wrappers leave in the last change**, together, when no feature reads them.
- **A moved feature's views are projections.** What `domain` composes at read time today, a materializer writes at commit time as rows the screen
  selects. `domain` gets no successor; the server's composition is thin and holds no view.
- **A feature owns its wire shape.** Its Schema classes, RPC group, and rejections live in a pure `contract` entry (`@antumbra/pieces/contract`) with
  no runtime dependency. The glass and other features import that entry and nothing else of the feature.
- **Rejections are Schema errors; everything else is a defect.** A command declares its rejections beside it as Schema classes with structured fields,
  and they cross the wire as they are. A row that does not decode, a missing table, an SDK that throws: defects, never mapped.
- **The issuer mints the id; the commit stamps the time.** An id is part of the command's input, made by one helper in the vocabulary. The commit
  stamps the fact once from the clock. A command re-issued with an id already done is rejected as already done, which is what makes a retry safe.
- **Nothing new is flat.** New packages land under the layout below; the flat packages under `packages/` are the old code and stay flat until their
  feature moves and deletes them.

## Layout

Two roots. `apps/` holds every process, `packages/` holds what they are made of, nested by the process a package belongs to and then by its role.
Package names stay short (`@antumbra/pieces`, `@antumbra/journal`); the path carries the group. A flat package under `packages/` is old code; when the
last flat package is deleted the move is over.

```
apps/
  desktop/          the shell: windows, spawn, supervise, restart
  server/           the server's main: assembles feature layers, wires edges to ports, serves the RPC groups
  runner/           the runner's main: holds sessions, writes its log, serves the tool binding

packages/
  platform/         shared by more than one process, no feature knowledge
    vocabulary/  feature/  service-definition/  trace-sink/  prompts/  skills/  rpc/  testing/
  server/
    journal/        the kit: commit, materializers, live query, DDL from Schema classes, rebuild, fact migrations
    domains/        settings/  voyages/  pieces/  boards/  rulings/  repos/  changes/  artifacts/  reports/  sessions/  inputs/  reclamation/  capacity/
    edges/          github/
  runner/
    fabric/         sessions, drain, the runner log
    tools/          the binding of tool sets into sessions
    ports/          what a backend must provide
    backends/       claude/  codex/  opencode/  pi/
    git/
  glass/
    renderer/  components/  harness/  atom-form/

  <flat>            the old code, untouched until its feature moves
```

A lint rule reads the path and holds the direction: `platform` imports only `platform`; a process group imports `platform` and itself; across process
groups only a feature's `contract` entry may be imported; inside `server` only a domain may import `journal`, and an edge imports `platform` only; old
packages import old packages and `platform`, and nothing nested imports old. The one exception the rule allows is a named list, so that `domain` can
read a moved feature until it is deleted; the list starts empty and every entry is removed with `domain`.

Every package in these groups exports `{ "./*": "./src/*" }` and nothing else: no `src/index.ts` barrel, no `"."` entry, no alias. An import names the
real file with its extension, the way a package's own `#…ts` imports already do (`@antumbra/vocabulary/board.ts`), and an asset a package hands out
lives under `src` and is named the same way. A flat package keeps the map it has and takes this rule when it moves. A second lint rule holds it.

## The order

| step | what                                                                                                                                                                                                                                                                                                                                                                    | status      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1    | Spikes: Effect SQL on `node:sqlite`, DDL from Schema classes, `atom-form`. Their findings are in the North Star.                                                                                                                                                                                                                                                        | landed      |
| 2    | Platform packages, standalone, with tests: the journal kit's core (commit, materializers, live query, DDL from Schema classes) and the RPC client's core (contract kit, client with a live atom). Reconcilers, rebuild on shape hash, fact migrations, reconnect, the token, and `atom-form` arrive with the first feature that needs each. Nothing in the app changes. | in progress |
| 3    | The server process on Effect RPC with one feature on the journal: Voyage role settings, one command, one fact, one projection, one screen. The Electron window is the first glass.                                                                                                                                                                                      | not started |
| 4    | Features move one at a time, in the order below.                                                                                                                                                                                                                                                                                                                        | not started |
| 5    | Delete Prisma, tRPC, and the wrappers.                                                                                                                                                                                                                                                                                                                                  | not started |

## Features

| feature                        | today                                                                | status      |
| ------------------------------ | -------------------------------------------------------------------- | ----------- |
| Voyage role settings           | `settings`, `contract` catalog                                       | not started |
| Settings, the rest             | `settings`                                                           | not started |
| Voyages                        | `voyages`                                                            | not started |
| Pieces and dependencies        | `pieces`                                                             | not started |
| Boards and mail                | `boards`                                                             | not started |
| Rulings                        | `rulings`                                                            | not started |
| Repositories                   | `repos`                                                              | not started |
| Changes and the GitHub adapter | `changes`, `github`                                                  | not started |
| Artifacts                      | `artifacts`                                                          | not started |
| Reports                        | `reports`                                                            | not started |
| Sessions, starts, the runner   | `session-fabric`, `sessions`, `kernel`, `runner-local`, the backends | not started |
| Session inputs                 | `session-inputs`                                                     | not started |
| Resource reclamation           | `resource-reclamation`                                               | not started |
| Provider capacity              | `provider-capacity`                                                  | not started |

## Packages

Where each package goes. A package "stays" when its job is unchanged by the move; it may still change packages' dependencies.

| today                                                                                            | becomes                                                                                                  | status      |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------- |
| `apps/desktop`                                                                                   | the shell: spawns server and runner, supervises, restarts; its windows are glass                         | not started |
| `contract`                                                                                       | deleted; each feature's `contract` entry carries its wire shape; the settings catalog stays a closed set | not started |
| `vocabulary`                                                                                     | stays: the neutral vocabulary of the runner's log, at `packages/platform/vocabulary`                     | landed      |
| `session-event-journal`                                                                          | the runner's log, owned by the runner                                                                    | not started |
| `session-inputs`                                                                                 | a domain: facts, projection, commands                                                                    | not started |
| `prompts`, `skills`                                                                              | stay, leaves, at `packages/platform/prompts` and `packages/platform/skills`                              | landed      |
| `plugin-api`                                                                                     | the runner's driven ports; the backends live in the runner                                               | not started |
| `agent-tools`                                                                                    | tool schemas and handlers on the server; binding in the runner                                           | not started |
| `service-definition`                                                                             | stays, at `packages/platform/service-definition`                                                         | landed      |
| `kernel`                                                                                         | commands plus the admission and executor reconcilers; Intents become request rows                        | not started |
| `intent-demand`                                                                                  | reconcilers over rows                                                                                    | not started |
| `domain-feeds`                                                                                   | reactivity keys, marked dirty by the commit                                                              | not started |
| `resource-reclamation`                                                                           | a reconciler over rows plus acts on the runner                                                           | not started |
| `changes`, `repos`, `voyages`, `pieces`, `boards`, `rulings`, `artifacts`, `reports`, `settings` | domains: Schema classes, facts, projections, commands                                                    | not started |
| `session-fabric`                                                                                 | the runner                                                                                               | not started |
| `sessions`                                                                                       | a projection over the runner's log                                                                       | not started |
| `domain`                                                                                         | deleted; its read-time composition becomes projections inside the features                               | not started |
| `git`                                                                                            | runner infrastructure, at `packages/runner/git`                                                          | not started |
| `github`                                                                                         | an edge adapter a reconciler calls; its observations come back through the commit                        | not started |
| `backend-claude`, `backend-codex`, `backend-opencode`, `backend-pi`                              | inside the runner                                                                                        | not started |
| `runner-local`                                                                                   | the runner process                                                                                       | not started |
| `persistence`                                                                                    | the journal kit, Effect SQL, DDL from Schema classes; Prisma leaves                                      | not started |
| `trace-sink`                                                                                     | stays, at `packages/platform/trace-sink`                                                                 | landed      |
| `renderer`, `harness`                                                                            | the glass on atoms; the harness stays                                                                    | not started |
| `testing-runtime`, `testing`                                                                     | the test kit: scripted runner, scripted backend, in-memory journal                                       | not started |

## Open before the kit

- The feature DSL: strongly typed, sugared creation of a feature's commands, materializer, reconciler, and `contract` entry. Whether a feature is an
  Effect service or a set of exported values is decided in the kit.

## Open before the runner split

- OpenCode's tool execution timeout: reportedly thirty seconds and not a plain setting. A tool call must be able to wait through a server swap.
- Codex per-session tools: a home directory per session, to be tried.
- Resume by native id on OpenCode and Pi: the calls exist at the command line; the SDK calls the runner will use are not yet named.
