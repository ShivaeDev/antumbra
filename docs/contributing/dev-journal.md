# Dev journal

The server keeps its durable truth in `server/journal.db` inside the dev data directory — `Antumbra-Dev` under the platform application-support path,
or whatever `ANTUMBRA_DEV_USER_DATA` names. The rows in that database are rebuildable projections of the facts the journal holds; the facts are the
truth.

`pnpm journal facts` reports what is in there. It prints one line per fact name the journal holds with its count, grouped under the feature that
declares it and in feature order, then the total and the highest sequence number. `--tail <count>` appends the last facts as
`seq timestamp name requestId` lines. It opens the database read-only.

`pnpm journal reset` deletes that file and its `-wal` and `-shm` side files, and nothing else: backups, traces, the runner log, and app-managed
content stay where they are. It refuses while Electron's `SingletonLock` sits in the data directory, which is how a running desktop app makes itself
known; a lock a crash left behind can be removed by hand.

## When a reset is the right move

A shape change is not one. When a row's shape changes, or a feature declares a new fact migration, startup backs the journal up and replays the
retained facts, and the projections follow the code without help.

Reset when the dev app should start from nothing — no Voyages, no Agents, no Sessions, no history — usually because what has accumulated is in the way
of what you are about to try. It throws every fact away for good, and `pnpm journal facts` is the last look at what it would discard.
