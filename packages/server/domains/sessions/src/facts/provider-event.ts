import { fact } from "@antumbra/platform-feature/fact.ts";
import { Origin } from "@antumbra/platform-vocabulary/session-events/origin.ts";
import { Schema } from "effect";
import { sessionEvent } from "#rows/session-event.ts";
import { UsageEvidence } from "#rows/usage-evidence.ts";

export const providerEvent = fact("SessionProviderEvent", {
	sessionId: sessionEvent.fields.rootSessionId,
	logId: sessionEvent.fields.logId,
	cursor: sessionEvent.fields.cursor,
	observedAt: sessionEvent.fields.observedAt,
	origin: Schema.NullOr(Origin),
	usage: Schema.NullOr(UsageEvidence),
});
