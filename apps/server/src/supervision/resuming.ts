import { stoppedLoops } from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Effect } from "effect";
import type { Loops } from "#supervision/handle.ts";
import { watchKeys } from "#supervision/keys.ts";

export const resuming = (loops: Loops) =>
	run({
		keys: watchKeys(stoppedLoops.reads, stoppedLoops.scope?.({})),
		read: Live.use((live) => live.read(stoppedLoops, {})),
		act: (entries) => Effect.forEach(entries, (entry) => (entry.state === "resumed" ? loops.start(entry.loop) : Effect.void), { discard: true }),
	});
