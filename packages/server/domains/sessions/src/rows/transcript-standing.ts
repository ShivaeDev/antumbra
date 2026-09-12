import { BackgroundTask, SessionState } from "@antumbra/platform-vocabulary/session-events/state.ts";
import { Schema } from "effect";
import { UsageEvidence } from "#rows/usage-evidence.ts";

export const SessionStanding = Schema.Struct({
	background: Schema.Array(BackgroundTask),
	open: Schema.Array(Schema.Struct({ name: Schema.String })),
	state: Schema.UndefinedOr(SessionState),
	usage: Schema.UndefinedOr(UsageEvidence),
});
export type SessionStanding = typeof SessionStanding.Type;
export const Activity = Schema.Struct({ live: Schema.Boolean, words: Schema.UndefinedOr(Schema.String) });
export type Activity = typeof Activity.Type;
