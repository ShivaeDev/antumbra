import type * as Source from "@antumbra/domain-sessions/queries/unaudited.ts";
import { type session, session as sessionRecordSchema } from "@antumbra/domain-sessions/rows/session.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";
export const unaudited = Effect.fn("sessions.unaudited")(function* (
	_input: Schema.Struct.Type<typeof Source.unaudited.input>,
): Effect.fn.Return<typeof Source.unaudited.output.Type, never, Records> {
	const rows = yield* Records;

	const nodes = yield* rows.session
		.findMany({
			where: { status: "closed", completeness: "recording" },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionSelection,
		})
		.pipe(Effect.orDie);
	const result: Array<{ node: typeof session.Row.Type; root: typeof session.Row.Type }> = [];
	for (const node of nodes) {
		const root = yield* rows.session
			.findById(node.rootSessionId)
			.pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie);
		if (node.nativeRef !== null && root.nativeRef !== null) result.push({ node, root });
	}
	return result;
});
