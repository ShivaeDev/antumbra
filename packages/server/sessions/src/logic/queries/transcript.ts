import type * as Source from "@antumbra/domain-sessions/queries/transcript.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionEventSelection } from "@antumbra/server-storage/records/session-event.ts";
import { selection as sessionOpeningSelection } from "@antumbra/server-storage/records/session-opening.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

export const transcriptSources = Effect.fn("Sessions.transcriptSources")(function* (
	input: Schema.Struct.Type<typeof Source.transcriptSources.input>,
): Effect.fn.Return<typeof Source.transcriptSources.output.Type, never, Records> {
	const rows = yield* Records;

	const held = yield* rows.session
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const operations = yield* rows.sessionOperation
		.findMany({ where: { sessionId: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	const instructions = [];
	for (const operation of operations) {
		const spoken = operation.kind === "wake" || operation.kind === "steer";
		if (!spoken || operation.inputId !== null || operation.status !== "accepted") continue;
		instructions.push(operation);
	}
	return {
		references: (yield* rows.sessionEvent
			.findMany({ where: { sessionId: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionEventSelection })
			.pipe(Effect.orDie)).toSorted((a, b) => a.sequence - b.sequence),
		nodes: Option.isNone(held)
			? []
			: yield* rows.session
					.findMany({
						where: { rootSessionId: held.value.rootSessionId },
						orderBy: { field: "storage_order", direction: "asc" },
						select: sessionSelection,
					})
					.pipe(Effect.orDie),
		opening: Option.getOrNull(
			yield* rows.sessionOpening
				.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOpeningSelection })
				.pipe(Effect.orDie),
		),
		instructions,
	};
});
