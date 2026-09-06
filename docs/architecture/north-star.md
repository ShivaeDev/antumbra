# The North Star

[Architecture today](../../ARCHITECTURE.md) · [Design axioms](../../DESIGN.md) · [Migration](migration.md)

This is the shape Antumbra is moving to. `ARCHITECTURE.md` describes the shape the code has; this document describes the one it will have, so every
change on the way is judged against a fixed target rather than against the last change. It is amended by ruling, never silently. How far the code has
come is tracked in [`migration.md`](migration.md), and nothing here is a claim that code exists.

## Four parts

A shell, one server, one or more runners, and the glass.

- **The shell** is the Electron app when the admiral has a desktop and a plain command line when there is none. It spawns the server and the runner as
  siblings, watches them, stages new builds, and is the only thing that ever restarts anything. Its windows are glass like every other client.
- **The server** owns durable truth: the journal, the projections, the commit, the reconcilers, the tool handlers, and the tailer that reads the
  runners' logs. It serves the glass and the runners over Effect RPC on a WebSocket, one RPC group each, behind a token, so a browser tab or a phone
  is a client like the desktop window. One server per install.
- **A runner** holds the SDK sessions as child processes: Claude Code, Codex, OpenCode, and Pi. It starts, stops, sleeps, and wakes sessions when
  asked, appends every provider event and every fact about a session to its own append-only SQLite log, and forwards tool calls to the server. It is
  dumb on purpose and asserts nothing about the domain. Several runners can exist at once, because that is how a runner is replaced without touching
  an agent.
- **The glass** is every window, tab, and phone screen. It holds no truth and projects nothing. A screen is a narrow live query, by id, that the
  server re-pushes when a fact changes what it shows; a transcript is streamed by sequence; a form sends a command and receives its verdict. A client
  that dies costs nothing.

Node only. One admiral now, several runner machines later, and nothing that precludes several admirals; authentication beyond the token is not
designed.

## The commit

Every durable fact enters through the commit, and nothing else writes a fact or a row.

A command is a typed schema, a guard, and the fact it emits. The commit runs one command at a time: the guard reads the projection rows as they are
now and either rejects with a typed error or lets the command through; the fact is appended to the journal with the next sequence number; every
materializer that listens for that fact writes its rows; the transaction commits; and as it commits the reactivity keys the fact names are marked
dirty. The caller receives the sequence number or the rejection. Nothing is ever behind: the moment a command is answered, every projection already
reflects it and every live query and reconciler that depends on it has been woken.

The SQLite client holds one write connection behind one permit, and a transaction keeps that permit for its whole scope, so the commit needs no lock
of its own; its waiters are the queue. Every read that is not a guard uses a second, read-only connection, which under WAL sees committed snapshots
and never waits for the writer. The journal runs WAL with `synchronous` NORMAL: a commit costs well under a millisecond, a process crash loses
nothing, and a power loss can lose the last commits since the checkpoint but never corrupts the file.

This is the one ruled exception to the [simplicity gate](../../quality-gates/simplicity.md)'s refusal of transactions, and it is the whole answer to
the server's concurrent callers. There is no second lock, no retry, no recovery path, and no startup healing around it. A guard reads rows and nothing
else: never the network, never the clock, never a runner.

## Facts, projections, one schema

The journal is the product surface. A fact is what happened, in the domain's words, with its sequence number and its time. When a fact's shape must
change, a numbered migration rewrites the stored facts once at boot and keeps their sequence numbers; there are no versioned facts and no upcasting on
read. The journal is not the place for provider events; those live in the runners' logs, and a domain fact references a session by id.

Projections are the rows that guards, reconcilers, and the glass read. A materializer is a pure function from a fact to row writes, declared beside
the projection it feeds; it performs no effect and returns the keys the fact dirties. A projection whose shape hash changed is dropped and replayed
from the journal at boot, while commands wait; nothing migrates a projection. A projection that ever outlasts a restart earns an online rebuild then,
not before.

A domain declares its facts, its projections, and its commands once, as Effect Schema classes. The tables, the RPC group, the form fields, and the
columns a screen shows are derived from those declarations. Nothing is declared twice, and a type that cannot be derived is a design question, not a
second declaration.

## Reconcilers

A reconciler is a live query and one function. It reads rows and writes nothing. When a key its query watches is marked dirty, it runs against the
rows as they are now and calls commands or the edge: the runner, the change host, the clock. Its runs never overlap; a key that fires during a run
makes it run once more when the run ends. Every reconciler reconciles once at boot and once after every reconnect, so a lost push costs latency, never
liveness. A fact is a trigger, never an instruction.

Two shapes cover every reconciler found so far.

- **`run` receives the whole result set** and decides over it. The admission reconciler sees a Voyage's pending starts and its free slots and admits
  the oldest that fit; each admit is a command whose guard re-checks the slots under the commit, so nothing can over-admit.
- **`each` receives one row** and performs one effect for it, with at most one call in flight per row id while the row matches the query. The executor
  sees an admitted start with no session and asks the runner to start it. The claim ends when the row leaves the query or the call fails, and the next
  look asks again.

Three gates keep an effect from happening twice: the guard inside the commit, admission by a reconciler that can wait, and the edge, which dedupes by
the request id it was given. There is no intent fact before an idempotent effect. A start is requested, admitted, running, or ended; there is no
"starting", because the runner writes `SessionStarted` to its own log before it answers, and a server that restarts simply asks again. Intent is
recorded before an effect only when the edge cannot dedupe, and no such edge exists today.

## The runner and its log

The runner's log is durable truth about sessions; the server asserts nothing about a session it did not read there.

| fact                                                                  | written when                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `SessionStarted(requestId, sessionId, sdk, toolSetVersion, runnerId)` | the child is up, before the start call is answered                     |
| `SessionFailed(requestId, reason)`                                    | the child could not be started                                         |
| provider events, verbatim                                             | as they stream; kept thirty days                                       |
| `ToolCalled(sessionId, callId, name, input)`                          | before the call leaves the runner                                      |
| `ToolAnswered(callId)`                                                | after the server answered, before the result reaches the model         |
| `SessionSlept(sessionId)`                                             | the child was stopped while idle; native id and working directory kept |
| `SessionWoke(sessionId, runnerId)`                                    | the child was resumed, possibly on another runner                      |
| `SessionEnded(sessionId, reason)`                                     | the child is gone: completed, stopped, or failed                       |

The server tails every runner's log from a cursor and feeds each fact through the commit without a guard. The cursor per runner log is the only
watermark in the system. Facts about a session are kept for good; provider events are pruned after thirty days, and the projections built over them
survive the pruning.

A runner that dies writes nothing, and its sessions read from their last fact: asleep if they were idle, stranded if they were mid-turn, never ended.
A hail, a send, an assignment, or mail that has come due wakes them on the current runner, which resumes the SDK session by its native id. A start the
runner could not perform parks the request as waiting with the runner's reason on its row, and an explicit retry re-admits it. An SDK that cannot
resume makes the wake hold visibly with the reason; a linked successor is the admiral's explicit choice. Idle sessions go to siesta by the clock and
wake on demand, which is what makes replacing a runner cheap. The [Agent recovery guide](../design/agent-recovery.md) owns the states; nothing here
adds one.

## Tools

Tools are defined once, as typed schemas and handlers on the server. A session receives its tool set, at a version, when it opens and keeps it until
it closes. The runner adapts the set to each provider and forwards every call as `tool(sessionId, callId, name, input)`. The handler runs for the
session's tool-set version; a handler that changes the world does so through a command whose guard uses the call id as its idempotency key, so a call
the runner repeats after a reconnect is answered from the rows rather than redone. Identity is bound at spawn and never appears in a tool's schema:
the model cannot name whom it acts for.

A tool call waits while the server is away. It never fails for that reason and the runner never gives up; if the server never returns, the runner dies
with the app. The runner configures each provider's tool timeout to make that true, and a build never removes a tool from under a live session.

## Restarting without touching an agent

Both sequences are run by the shell. Nothing before the swap touches the live files.

**Replacing the server.** The shell checkpoints the write-ahead log and copies the journal beside it. It boots the staged build against the copy on a
spare port: fact migrations run, projections whose shape changed rebuild, and a health check answers one command and one live query. It then compares
the tool-set versions the staged build still serves with the versions live sessions use; a live session on a version the staged build dropped makes
the restart unsafe, and the restart waits while the glass names the sessions that block it. A safe restart proceeds on its own unless the install
holds restarts for a manual go. The live server closes its commit: commands from the glass receive a typed `Restarting` rejection and tool calls from
the runner simply wait. The staged build starts on the real journal, migrates for real, rebuilds, opens the commit, and tails the runner logs from
their cursors; the runner reconnects, pending tool calls resume, and the glass reconnects. If the new server fails its health check, the shell stops
it, restores the copy, starts the previous build, and marks the staged build bad. The runner and its sessions notice nothing either way.

**Replacing a runner.** The new runner registers beside the old one, and the current runner is a row the executor reads. New sessions start there. The
old runner sleeps its idle sessions at once and lets a session mid-turn finish its turn before sleeping it; a session with subsessions in flight is
mid-turn by definition. A sleeping session wakes on the current runner when something asks for it. The old runner exits when it holds no session;
there is no timeout, and the glass shows what still blocks it for the admiral to stop or wait for. An incompatible change to the runner's RPC means a
full shutdown, which is the ordinary quit.

Quitting the app still stops everything and still cuts turns, and a restart the admiral asks for still wakes exactly the roots it cut.

## Verified constraints

Facts established before this shape was fixed, so that nobody re-derives them.

- `@effect/sql-sqlite-node` on the Effect 4 line drives `node:sqlite` through one connection per client with no pool. `withTransaction` exists, rolls
  back on failure and defect, and nests as a savepoint. The client's own one-permit semaphore serializes transactions; a second permit around it is a
  second lock around the same lock.
- Every plain query on the write client waits behind an open transaction. A read-only client on the same file is concurrent under WAL.
- Reactivity re-runs a query at most once in flight and once pending, with no debounce, which is the latest-value rule reconcilers need; it does not
  coalesce for a slow consumer, so the reconciler runtime owns that. Keys are invalidated after the transaction commits, never inside it.
- A second writable connection on one file freezes the whole event loop while it waits, because `node:sqlite` is synchronous. One writer per file per
  process.
- A commit of one insert and one update costs about 0.07 ms under WAL with `synchronous` NORMAL. Surviving power loss on macOS needs `fullfsync` and
  costs about 5 ms per commit; that setting was ruled out.
- Claude Code cannot recover a transcript that references a tool its tool set no longer carries. Codex cannot take MCP servers per session and needs a
  home directory per session. The Codex tool timeout defaults to sixty seconds and the runner raises it. OpenCode's tool execution timeout is not yet
  verified. Pi runs its tools in process.

## What this replaces

Prisma and its generated client; tRPC over Electron IPC and the renderer's own projections; the Kernel's mortal Intents, its tick, and the demand
bridge that recreates them; post-commit feeds as a mechanism beside the writes; the in-process session fabric and every per-package restart path. Each
of these leaves when the feature that needs it moves; [`migration.md`](migration.md) says which have.
