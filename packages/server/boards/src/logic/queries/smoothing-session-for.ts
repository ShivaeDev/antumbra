import type * as Source from "@antumbra/domain-boards/queries/smoothing-session-for.ts";
import { smoothingAttempt as smoothingAttemptRecordSchema } from "@antumbra/domain-boards/rows/smoothing-attempt.ts";
import { selection as smoothingSessionSelection } from "@antumbra/server-storage/records/smoothing-session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, Schema } from "effect";

export const smoothingSessionFor = Effect.fn("boards.smoothingSessionFor")(function* (
	input: Schema.Struct.Type<typeof Source.smoothingSessionFor.input>,
): Effect.fn.Return<typeof Source.smoothingSessionFor.output.Type, never, Records> {
	const rows = yield* Records;

	const held = yield* rows.smoothingSession
		.findOne({ where: { sessionId: input.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: smoothingSessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held)) return null;
	const attempt = yield* rows.smoothingAttempt
		.findById(held.value.attemptId)
		.pipe(Effect.flatMap(Schema.decodeUnknownEffect(smoothingAttemptRecordSchema.Row)), Effect.orDie);
	return { ...held.value, voyageId: attempt.voyageId };
});
