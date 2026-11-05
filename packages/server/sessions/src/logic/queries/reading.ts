import type * as Source from "@antumbra/domain-sessions/queries/reading.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const reading = Effect.fn("sessions.reading")(function* (
	input: Schema.Struct.Type<typeof Source.reading.input>,
): Effect.fn.Return<typeof Source.reading.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.session
			.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie),
	);
});
export const forAgent = Effect.fn("sessions.forAgent")(function* (
	input: Schema.Struct.Type<typeof Source.forAgent.input>,
): Effect.fn.Return<typeof Source.forAgent.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.session
		.findMany({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
});
