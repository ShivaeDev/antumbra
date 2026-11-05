import type * as Source from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import { selection as stoppedLoopSelection } from "@antumbra/server-storage/records/stopped-loop.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const stoppedLoops = Effect.fn("supervision.stoppedLoops")(function* (
	_input: Schema.Struct.Type<typeof Source.stoppedLoops.input>,
): Effect.fn.Return<typeof Source.stoppedLoops.output.Type, never, Records> {
	const rows = yield* Records;

	const held = yield* rows.stoppedLoop
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: stoppedLoopSelection })
		.pipe(Effect.orDie);
	return [...held].sort((left, right) => right.at - left.at);
});
