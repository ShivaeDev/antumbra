import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const sessionChartered = fact("SessionChartered", {
	sessionId: SessionId,
	inputId: Schema.String,
	standingOrders: Schema.NullOr(Schema.String),
	charter: Schema.String,
});

export const sessionCharteredMaterializer = Effect.fn("Sessions.SessionChartered")(function* (
	fact: FactValue<typeof sessionChartered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.sessionOpening
		.insertVoid({
			id: fact.sessionId,
			inputId: fact.inputId,
			standingOrders: fact.standingOrders,
			charter: fact.charter,
			sequence: fact.seq,
		})
		.pipe(Effect.orDie);
});
