import { Database } from "@antumbra/persistence";
import { UsageEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect, Option, Schema } from "effect";

export interface SessionUsage {
	readonly at: Date;
	readonly sessionId: string;
	readonly usage: typeof UsageEvent.Type;
}

interface UsageRow {
	readonly at: Date;
	readonly payload: string;
	readonly sessionId: string;
}

const decodeUsage = Schema.decodeUnknownOption(Schema.fromJsonString(UsageEvent));

const readingsOf = (row: UsageRow): ReadonlyArray<SessionUsage> =>
	Option.match(decodeUsage(row.payload), {
		onNone: (): ReadonlyArray<SessionUsage> => [],
		onSome: (usage) => [{ at: row.at, sessionId: row.sessionId, usage }],
	});

export const usage = Effect.fn("SessionEventJournal.usage")(function* () {
	const db = yield* Database;
	const rows = yield* db.SessionEvent.where({ kind: "usage" }).all();
	return rows.flatMap(readingsOf);
});
