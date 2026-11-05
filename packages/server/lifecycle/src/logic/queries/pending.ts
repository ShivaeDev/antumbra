import { RESTART } from "@antumbra/domain-lifecycle/ids.ts";
import type * as Source from "@antumbra/domain-lifecycle/queries/pending.ts";
import { selection as restartSelection } from "@antumbra/server-storage/records/restart.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const pending = Effect.fn("Lifecycle.pending")(function* (
	_input: Schema.Struct.Type<typeof Source.pending.input>,
): Effect.fn.Return<typeof Source.pending.output.Type, never, Records> {
	const rows = yield* Records;

	const held = yield* rows.restart
		.findOne({ where: { id: RESTART }, orderBy: { field: "storage_order", direction: "asc" }, select: restartSelection })
		.pipe(Effect.orDie);
	return Option.isSome(held) ? held.value.sessionIds : null;
});
