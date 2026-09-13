import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionOpening } from "#rows/session-opening.ts";

export const sessionChartered = fact("SessionChartered", {
	sessionId: SessionId,
	inputId: Schema.String,
	standingOrders: Schema.NullOr(Schema.String),
	charter: Schema.String,
});

export const charter = command("charter", {
	input: { sessionId: SessionId, inputId: Schema.String, standingOrders: Schema.NullOr(Schema.String), charter: Schema.String },
	reads: [],
	emits: sessionChartered,
	rejections: {},
	run: (input) =>
		Effect.succeed({
			sessionId: input.sessionId,
			inputId: input.inputId,
			standingOrders: input.standingOrders,
			charter: input.charter,
		}),
});

export const sessionCharteredMaterializer = materializer(sessionChartered, {
	writes: [sessionOpening],
	run: Effect.fn("Sessions.SessionChartered")(function* (fact, rows) {
		yield* rows.sessionOpening.insert({
			id: fact.sessionId,
			inputId: fact.inputId,
			standingOrders: fact.standingOrders,
			charter: fact.charter,
			sequence: fact.seq,
		});
	}),
});
