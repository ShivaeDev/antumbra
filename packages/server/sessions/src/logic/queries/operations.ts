import type * as Source from "@antumbra/domain-sessions/queries/operations.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const operations = Effect.fn("Sessions.operations")(function* (
	input: Schema.Struct.Type<typeof Source.operations.input>,
): Effect.fn.Return<typeof Source.operations.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.sessionOperation
		.findMany({ where: { sessionId: input.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	return stored.toSorted((left, right) => left.requestedAt.localeCompare(right.requestedAt));
});
