import { resumeLoop } from "@antumbra/domain-supervision/commands/loop-resumed.ts";
import { stoppedLoops } from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import type { stoppedLoop } from "@antumbra/domain-supervision/rows/stopped-loop.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import type { Loops } from "#supervision/handle.ts";

type Entry = typeof stoppedLoop.Row.Type;

const settle = Effect.fn("Supervision.settle")(function* (loops: Loops, entry: Entry) {
	const running = loops.running(entry.loop);
	if (entry.state === "resumed") return yield* running ? Effect.void : loops.start(entry.loop);
	if (!running) return;
	const commit = yield* Commit;
	yield* commit
		.commit(resumeLoop, { loop: entry.loop, requestId: Request.make(`loop-resumed:${entry.loop}:${entry.at}`) })
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});

export const resuming = (loops: Loops) =>
	run(stoppedLoops, {}, (entries) => Effect.forEach(entries, (entry) => settle(loops, entry), { discard: true }));
