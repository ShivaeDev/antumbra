import type * as Source from "@antumbra/domain-agents/queries/birth-by-session.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const birthBySession = Effect.fn("Agents.birthBySession")(function* (
	input: Schema.Struct.Type<typeof Source.birthBySession.input>,
): Effect.fn.Return<typeof Source.birthBySession.output.Type, never, Records> {
	const rows = yield* Records;

	return (
		(yield* rows.birth
			.findMany({ where: { sessionId: input.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
			.pipe(Effect.orDie))[0] ?? null
	);
});
