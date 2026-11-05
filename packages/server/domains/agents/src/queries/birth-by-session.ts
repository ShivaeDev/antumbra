import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { birth } from "#rows/birth.ts";
export const birthBySession = query("birthBySession", {
	input: { sessionId: SessionId },
	output: Schema.NullOr(birth.Row),
	reads: [birth],
});
