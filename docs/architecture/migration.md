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

## The order

| step | what                                                                                                                                                                                                                                 | status      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1    | Spikes: Effect SQL on `node:sqlite`, DDL from Schema classes, `atom-form`. Their findings are in the North Star.                                                                                                                     | landed      |
| 2    | Platform packages, standalone, with tests: the journal kit (commit, materializers, reconcilers, DDL, rebuild on shape hash, fact migrations), the RPC client (live atom, reconnect, token), `atom-form`. Nothing in the app changes. | not started |
| 3    | The server process on Effect RPC with one feature on the journal: Voyage role settings, one command, one fact, one projection, one screen. The Electron window is the first glass.                                                   | not started |
| 4    | Features move one at a time, in the order below.                                                                                                                                                                                     | not started |
| 5    | Delete Prisma, tRPC, and the wrappers.                                                                                                                                                                                               | not started |

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

| today                                                                                            | becomes                                                                                    | status      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------- |
| `apps/desktop`                                                                                   | the shell: spawns server and runner, supervises, restarts; its windows are glass           | not started |
| `contract`                                                                                       | the RPC contract, derived from the Schema classes; the settings catalog stays a closed set | not started |
| `vocabulary`                                                                                     | stays: the neutral vocabulary of the runner's log                                          | stays       |
| `session-event-journal`                                                                          | the runner's log, owned by the runner                                                      | not started |
| `session-inputs`                                                                                 | a domain: facts, projection, commands                                                      | not started |
| `prompts`, `skills`                                                                              | stay, leaves                                                                               | stays       |
| `plugin-api`                                                                                     | the runner's driven ports; the backends live in the runner                                 | not started |
| `agent-tools`                                                                                    | tool schemas and handlers on the server; binding in the runner                             | not started |
| `service-definition`                                                                             | stays                                                                                      | stays       |
| `kernel`                                                                                         | commands plus the admission and executor reconcilers; Intents become request rows          | not started |
| `intent-demand`                                                                                  | reconcilers over rows                                                                      | not started |
| `domain-feeds`                                                                                   | reactivity keys, marked dirty by the commit                                                | not started |
| `resource-reclamation`                                                                           | a reconciler over rows plus acts on the runner                                             | not started |
| `changes`, `repos`, `voyages`, `pieces`, `boards`, `rulings`, `artifacts`, `reports`, `settings` | domains: Schema classes, facts, projections, commands                                      | not started |
| `session-fabric`                                                                                 | the runner                                                                                 | not started |
| `sessions`                                                                                       | a projection over the runner's log                                                         | not started |
| `domain`                                                                                         | the server's RPC groups                                                                    | not started |
| `git`                                                                                            | runner infrastructure                                                                      | stays       |
| `github`                                                                                         | an edge adapter a reconciler calls; its observations come back through the commit          | not started |
| `backend-claude`, `backend-codex`, `backend-opencode`, `backend-pi`                              | inside the runner                                                                          | not started |
| `runner-local`                                                                                   | the runner process                                                                         | not started |
| `persistence`                                                                                    | the journal kit, Effect SQL, DDL from Schema classes; Prisma leaves                        | not started |
| `trace-sink`                                                                                     | stays                                                                                      | stays       |
| `renderer`, `harness`                                                                            | the glass on atoms; the harness stays                                                      | not started |
| `testing-runtime`, `testing`                                                                     | the test kit: scripted runner, scripted backend, in-memory journal                         | not started |

## Open before the runner split

- OpenCode's tool execution timeout: reportedly thirty seconds and not a plain setting. A tool call must be able to wait through a server swap.
- Codex per-session tools: a home directory per session, to be tried.
- Resume by native id on OpenCode and Pi: the calls exist at the command line; the SDK calls the runner will use are not yet named.
