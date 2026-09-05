import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";

export const journalOn = Effect.fn("SessionTreeAudits.journalOn")(function* (sessionId: string, findings: ReadonlyArray<AgentEvent>) {
	const journal = yield* SessionEventJournal;
	yield* Effect.forEach(findings, (event) => journal.record(sessionId, event), { concurrency: 1, discard: true });
});
