import type * as Source from "@antumbra/domain-agents/queries/pending.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const pending = Effect.fn("Agents.pending")(function* (
	_input: Schema.Struct.Type<typeof Source.pending.input>,
): Effect.fn.Return<typeof Source.pending.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.birth
		.findMany({ where: { status: "requested" }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie)).toSorted((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id));
});
