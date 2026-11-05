import type * as Source from "@antumbra/domain-changes/queries/session-situations.ts";
import { selection as sessionSituationSelection } from "@antumbra/server-storage/records/session-situation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const sessionSituations = Effect.fn("changes.sessionSituations")(function* (
	input: Schema.Struct.Type<typeof Source.sessionSituations.input>,
): Effect.fn.Return<typeof Source.sessionSituations.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.sessionSituation
		.findMany({ where: input, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSituationSelection })
		.pipe(Effect.orDie);
});
