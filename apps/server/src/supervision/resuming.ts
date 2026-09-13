import { stoppedLoops } from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import type { Loops } from "#supervision/handle.ts";

export const resuming = (loops: Loops) =>
	run(stoppedLoops, {}, (entries) =>
		Effect.forEach(entries, (entry) => (entry.state === "resumed" ? loops.start(entry.loop) : Effect.void), { discard: true }),
	);
