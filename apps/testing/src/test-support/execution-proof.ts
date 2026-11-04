import type { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { transcriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { appendPostgres } from "@antumbra/server/runner/postgres.ts";
import { TranscriptLog } from "@antumbra/server/transcript/read-log.ts";
import { snapshot } from "@antumbra/server/transcript/snapshot.ts";
import { Effect } from "effect";
import { RpcTest } from "effect/rpc";
import { answered } from "#answers.ts";
export const executionProof = Effect.fn("PostgresApp.executionProof")(function* () {
	const log = yield* TranscriptLog;
	const client = yield* RpcTest.makeClient(TranscriptRpc, { flatten: true });
	return {
		appendRunner: (logId: string, entries: readonly LogEntry[]) => appendPostgres({ logId, entries }),
		transcript: (id: SessionId) => answered(client("sessions.transcript", { id }), "PostgreSQL transcript"),
		transcriptFromSources: (sources: typeof transcriptSources.output.Type, id: SessionId) =>
			snapshot(sources, id).pipe(Effect.provideService(TranscriptLog, log)),
	};
});
