import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";

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
});
