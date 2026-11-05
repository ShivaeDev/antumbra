import type { transcriptSources as query } from "@antumbra/domain-sessions/queries/transcript.ts";
import { transcriptSources as queryDecision } from "@antumbra/server-sessions/logic/queries/transcript.ts";
import type { Schema } from "effect";
import { Effect } from "effect";
export const transcriptSources = Effect.fn("Sessions.transcriptSources")(function* (input: Schema.Struct.Type<typeof query.input>) {
	return yield* queryDecision(input);
});
