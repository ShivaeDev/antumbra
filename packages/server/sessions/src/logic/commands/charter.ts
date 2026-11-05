import type * as Source from "@antumbra/domain-sessions/commands/charter.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";

export const sessionChartered = fact("SessionChartered", {
	sessionId: SessionId,
	inputId: Schema.String,
	standingOrders: Schema.NullOr(Schema.String),
	charter: Schema.String,
});

export const charter = (input: typeof Source.charter.Input.Type) =>
	Effect.succeed({
		sessionId: input.sessionId,
		inputId: input.inputId,
		standingOrders: input.standingOrders,
		charter: input.charter,
	});
