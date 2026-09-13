import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionOpening } from "#rows/session-opening.ts";

export const sessionChartered = fact("SessionChartered", {
	sessionId: SessionId,
	standingOrders: Schema.NullOr(Schema.String),
	charter: Schema.String,
});

export const charter = command("charter", {
	input: { sessionId: SessionId, standingOrders: Schema.NullOr(Schema.String), charter: Schema.String },
	reads: [],
	emits: sessionChartered,
	rejections: {},
	run: (input) => Effect.succeed({ sessionId: input.sessionId, standingOrders: input.standingOrders, charter: input.charter }),
});

export const sessionCharteredMaterializer = materializer(sessionChartered, {
	writes: [sessionOpening],
	run: Effect.fn("Sessions.SessionChartered")(function* (fact, rows) {
		const opening = { standingOrders: fact.standingOrders, charter: fact.charter, sequence: fact.seq };
		const held = yield* rows.sessionOpening.find(fact.sessionId);
		if (Option.isSome(held)) return yield* rows.sessionOpening.update(fact.sessionId, opening);
		yield* rows.sessionOpening.insert({ id: fact.sessionId, ...opening });
	}),
});
