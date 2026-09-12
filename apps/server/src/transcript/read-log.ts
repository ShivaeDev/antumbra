import type { sessionEvent } from "@antumbra/domain-sessions/rows/session-event.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { make } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { SessionEvent } from "#transcript/types.ts";

export const readLog = Effect.fn("Transcript.readLog")(function* (logId: string, references: readonly (typeof sessionEvent.Row.Type)[]) {
	const runners = yield* RunnerOperations;
	const owner = (yield* runners.connected).find((runner) => runner.logId === logId);
	if (owner === undefined) return { events: [], unavailable: [`The runner holding log ${logId} is disconnected.`] };
	const after = Math.min(...references.map((reference) => reference.cursor)) - 1;
	const result = yield* runners.execute(owner.runnerId, { type: "ReadLog", requestId: make(), logId, after });
	if (result.type !== "LogRead")
		return { events: [], unavailable: [result.type === "Refused" ? result.reason : "The runner did not return its transcript."] };
	const byCursor = new Map(result.entries.map((entry) => [entry.cursor, entry]));
	const events: SessionEvent[] = [];
	for (const reference of references) {
		const entry = byCursor.get(reference.cursor);
		if (entry?.event.type === "ProviderEvent") events.push({ seq: reference.sequence, event: entry.event.event });
	}
	const unavailable = references.some((reference) => !byCursor.has(reference.cursor)) ? ["Some earlier provider events are no longer retained."] : [];
	return { events, unavailable };
});
