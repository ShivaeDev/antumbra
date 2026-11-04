import { transcriptSources as query } from "@antumbra/domain-sessions/queries/transcript.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { Effect } from "effect";
export const transcriptSources = Effect.fn("Sessions.transcriptSources")(function* (input: Parameters<typeof query.run>[0]) {
	return yield* query.run(input, yield* (yield* ExecutionHistory).rowsFor(query.reads), {});
});
