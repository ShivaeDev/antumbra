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
- **A feature owns its wire shape.** Its Schema classes, RPC group, and rejections are files of the feature with no runtime dependency
  (`@antumbra/pieces/feature.ts`, `@antumbra/pieces/rows/piece.ts`). The glass and other features import those files directly and nothing else of the
  feature. A domain's sources reach another domain only through its rows, queries and ids; a materializer that writes a neighbour's row uses that
  neighbour's id rule.
- **Application tests run the whole production application.** Backend tests use `it.app` and screen tests use `it.glass`, both over the application
  layer production uses. The entries live in `@antumbra/app-testing`, own setup and cleanup, and accept no feature list. Tests stay beside the package
  whose behavior they prove and dev-depend on app-testing; only cross-package workflows without one owner live under `apps/`. Production dependency
  direction stays unchanged; only external boundaries are replaced for the test environment.
- **Rejections are Schema errors; everything else is a defect.** A command declares its rejections beside it as Schema classes with structured fields,
  and they cross the wire as they are. A row that does not decode, a missing table, an SDK that throws: defects, never mapped.
- **The issuer mints the id; the commit stamps the time.** An id is part of the command's input, made by one helper in the vocabulary. The commit
  stamps the fact once from the clock. A command re-issued with an id already done is rejected as already done, which is what makes a retry safe.
- **Nothing new is flat.** New packages land under the layout below; the flat packages under `packages/` are the old code and stay flat until their
  feature moves and deletes them.
- **A package of the moved world is named `@antumbra/<group>-<folder>`:** the group is the folder it sits in, singular (`platform-feature`,
  `server-journal`, `domain-settings`, `glass-settings`); an old package keeps its name until it is deleted.
- **A screen names a command; the form derives from the command's schema, which declares every value a field can take.** A field's title, the values
  it may take, and the query its choices come from are annotations on the command's input, so a screen holds only what only it knows: the row it
  edits, the fields that identify it, and the placeholder text.
- **A move states its carry-over.** A feature's pull request says whether the data it already stored carries over and how. No move so far carries
  anything over: the database is wiped before each ships, and the admiral re-enters the role defaults, the fleet's settings, the voyages, and the
  pieces.
- **A fact may seed another domain's rows when the two are opened together.** The materializer imports the row it writes from the domain that owns it,
  so opening a voyage writes the voyage row and the captain's and the crew's role settings in one commit.

## Layout

Two roots. `apps/` holds every process, `packages/` holds what they are made of, nested by the process a package belongs to and then by its role. A
package's name repeats the group its path puts it in. A flat package under `packages/` is old code; when the last flat package is deleted the move is
over.

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
    domains/        role-settings/  backends/  settings/  voyages/  pieces/  boards/  rulings/  repos/  changes/  artifacts/  reports/  sessions/  inputs/  reclamation/  capacity/
    edges/          github/
  runner/
    fabric/         sessions, drain, the runner log
    tools/          the binding of tool sets into sessions
    ports/          what a backend must provide
    backends/       claude/  codex/  opencode/  pi/
    git/
  glass/
    client/  form/  components/  renderer/  harness/
    role-settings/  settings/  voyages/  pieces/  boards/    a feature's screens, one glass package per feature

  <flat>            the old code, untouched until its feature moves
```

A lint rule reads the path and holds the direction: `platform` imports only `platform`; a process group imports `platform` and itself; across process
groups the glass imports a domain's files and nothing else crosses; inside `server` only a domain may import `journal`, and an edge imports `platform`
only; old packages import old packages and `platform`, and nothing nested imports old. The one exception the rule allows is a named list, so that
`domain` can read a moved feature until it is deleted and the old renderer can mount a glass island until the renderer moves (`@antumbra/renderer`
reaching `@antumbra/glass-role-settings`, `@antumbra/glass-settings`, `@antumbra/glass-voyages`, `@antumbra/glass-pieces` and
`@antumbra/glass-boards`); every entry is removed with the package that needed it.

Every package in these groups exports `{ "./*": "./src/*" }` and nothing else: no `src/index.ts` barrel, no `"."` entry, no alias. An import names the
real file with its extension, the way a package's own `#…ts` imports already do (`@antumbra/platform-vocabulary/board.ts`), and an asset a package
hands out lives under `src` and is named the same way. A flat package keeps the map it has and takes this rule when it moves. A second lint rule holds
it.

A package outside `apps/` cannot reach the machine: no process, file, network or socket module and no Node platform layer, the two named SQLite owners
excepted; a third lint rule holds it.

A test never reaches for a process it does not own: no test file kills or scans processes by pid, and a test outside `apps/` and the flat packages
never spawns, `service-definition` excepted so its compiler fixtures can run `tsc` on a temp directory; a fourth lint rule holds it.

## The order

| step | what                                                                                                                                                                                                                                                                                                                                                                     | status      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1    | Spikes: Effect SQL on `node:sqlite`, DDL from Schema classes, `glass-form`. Their findings are in the North Star.                                                                                                                                                                                                                                                        | landed      |
| 2    | Platform packages, standalone, with tests: the journal kit's core (commit, materializers, live query, DDL from Schema classes) and the RPC client's core (contract kit, client with a live atom). Reconcilers, rebuild on shape hash, fact migrations, reconnect, the token, and `glass-form` arrive with the first feature that needs each. Nothing in the app changes. | in progress |
| 3    | The server process on Effect RPC with one feature on the journal: Voyage role settings, one command, one fact, one projection, one screen. The Electron window is the first glass.                                                                                                                                                                                       | landed      |
| 4    | Features move one at a time, in the order below.                                                                                                                                                                                                                                                                                                                         | in progress |
| 5    | Delete Prisma, tRPC, and the wrappers.                                                                                                                                                                                                                                                                                                                                   | not started |

## Features

| feature                        | today                                                                | status                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voyage role settings           | `settings`, `contract` catalog                                       | landed                                                                                                                                                                      |
| Settings, the rest             | `settings`                                                           | landed                                                                                                                                                                      |
| Voyages                        | `voyages`                                                            | truth and open form landed; list and detail follow piece state                                                                                                              |
| Pieces and dependencies        | `pieces`                                                             | truth, charter, rewire and acts landed; the verdict is a column no screen writes yet; state stays derived in the old domain until agents, changes, reports and rulings move |
| Boards                         | `boards`                                                             | truth and the composer landed; the entry tree and smoothing follow smoothing                                                                                                |
| Mail                           | `boards`                                                             | truth landed; delivery and wakes follow sessions                                                                                                                            |
| Rulings                        | `rulings`                                                            | not started                                                                                                                                                                 |
| Repositories                   | `repos`                                                              | not started                                                                                                                                                                 |
| Changes and the GitHub adapter | `changes`, `github`                                                  | not started                                                                                                                                                                 |
| Artifacts                      | `artifacts`                                                          | not started                                                                                                                                                                 |
| Reports                        | `reports`                                                            | not started                                                                                                                                                                 |
| Sessions, starts, the runner   | `session-fabric`, `sessions`, `kernel`, `runner-local`, the backends | not started                                                                                                                                                                 |
| Session inputs                 | `session-inputs`                                                     | not started                                                                                                                                                                 |
| Resource reclamation           | `resource-reclamation`                                               | not started                                                                                                                                                                 |
| Provider capacity              | `provider-capacity`                                                  | not started                                                                                                                                                                 |

## Packages

Where each package goes. A package "stays" when its job is unchanged by the move; it may still change packages' dependencies.

| today                                                               | becomes                                                                                                                                                        | status      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `apps/desktop`                                                      | the shell: spawns server and runner, supervises, restarts; its windows are glass                                                                               | in progress |
| `contract`                                                          | deleted; a feature's own files carry its wire shape; the settings catalog stays a closed set                                                                   | not started |
| `vocabulary`                                                        | stays: the neutral vocabulary of the runner's log, at `packages/platform/vocabulary`                                                                           | landed      |
| `session-event-journal`                                             | the runner's log, owned by the runner                                                                                                                          | not started |
| `session-inputs`                                                    | a domain: facts, projection, commands                                                                                                                          | not started |
| `prompts`, `skills`                                                 | stay, leaves, at `packages/platform/prompts` and `packages/platform/skills`                                                                                    | landed      |
| `plugin-api`                                                        | the runner's driven ports; the backends live in the runner                                                                                                     | not started |
| `agent-tools`                                                       | tool schemas and handlers on the server; binding in the runner                                                                                                 | not started |
| `service-definition`                                                | stays, at `packages/platform/service-definition`                                                                                                               | landed      |
| `kernel`                                                            | commands plus the admission and executor reconcilers; Intents become request rows                                                                              | not started |
| `intent-demand`                                                     | reconcilers over rows                                                                                                                                          | not started |
| `domain-feeds`                                                      | reactivity keys, marked dirty by the commit                                                                                                                    | not started |
| `resource-reclamation`                                              | a reconciler over rows plus acts on the runner                                                                                                                 | not started |
| `settings`                                                          | both halves are domains: `role-settings` and `settings`; the roles' service and words stay                                                                     | in progress |
| the backends' model catalogue (`domain`, `plugin-api`)              | a domain the shell reports into: `packages/server/domains/backends`                                                                                            | in progress |
| `voyages`                                                           | the voyage row and opening it are a domain at `packages/server/domains/voyages`; `authority/*` and `captainRole` stay until agents move                        | in progress |
| `pieces`                                                            | the piece row, its wiring and its acts are a domain at `packages/server/domains/pieces`; the `Pieces` seam and `assignAgent` stay until agents move            | in progress |
| `boards`, the mail half                                             | the message row with its precedence and its delivered and read stamps is a domain at `packages/server/domains/mail`; the `Mail` seam stays until sessions move | in progress |
| `boards`                                                            | the board entry and writing to it are a domain at `packages/server/domains/boards`; the `Boards` seam and the pure summaries stay until smoothing moves        | in progress |
| `changes`, `repos`, `rulings`, `artifacts`, `reports`               | domains: Schema classes, facts, projections, commands                                                                                                          | not started |
| `session-fabric`                                                    | the runner                                                                                                                                                     | not started |
| `sessions`                                                          | a projection over the runner's log                                                                                                                             | not started |
| `domain`                                                            | deleted; its read-time composition becomes projections inside the features                                                                                     | not started |
| `git`                                                               | runner infrastructure, at `packages/runner/git`                                                                                                                | not started |
| `github`                                                            | an edge adapter a reconciler calls; its observations come back through the commit                                                                              | not started |
| `backend-claude`, `backend-codex`, `backend-opencode`, `backend-pi` | inside the runner                                                                                                                                              | not started |
| `runner-local`                                                      | the runner process                                                                                                                                             | not started |
| `persistence`                                                       | the journal kit, Effect SQL, DDL from Schema classes; Prisma leaves                                                                                            | not started |
| `trace-sink`                                                        | stays, at `packages/platform/trace-sink`                                                                                                                       | landed      |
| `renderer`, `harness`                                               | the glass on atoms; the harness stays                                                                                                                          | in progress |
| `testing-runtime`, `testing`                                        | the test kit: scripted runner, scripted backend, in-memory journal                                                                                             | not started |

## Open before the kit

- The feature DSL: strongly typed, sugared creation of a feature's commands, materializer, reconciler, and the files that carry its wire shape.
  Whether a feature is an Effect service or a set of exported values is decided in the kit.

## Open before the runner split

- OpenCode's tool execution timeout: reportedly thirty seconds and not a plain setting. A tool call must be able to wait through a server swap.
- Codex per-session tools: a home directory per session, to be tried.
- Resume by native id on OpenCode and Pi: the calls exist at the command line; the SDK calls the runner will use are not yet named.
