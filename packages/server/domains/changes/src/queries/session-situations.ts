import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { sessionSituation } from "#rows/session-situation.ts";

export const sessionSituations = query("sessionSituations", {
	input: { sessionId: SessionId },
	output: Schema.Array(sessionSituation.Row),
	reads: [sessionSituation],
});
