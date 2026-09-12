import { fact } from "@antumbra/platform-feature/fact.ts";
import { Origin } from "@antumbra/platform-vocabulary/session-events/origin.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { UsageEvidence } from "#usage/evidence.ts";

export const providerEvent = fact("SessionProviderEvent", {
	sessionId: SessionId,
	logId: Schema.String,
	cursor: Schema.Number,
	observedAt: Schema.Number,
	origin: Schema.NullOr(Origin),
	usage: Schema.NullOr(UsageEvidence),
});
