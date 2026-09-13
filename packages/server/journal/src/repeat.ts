import type { FactShape } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";

export const repeatOf = Effect.fn("journal.repeatOf")(function* (sql: SqlClient, fact: FactShape, payload: string) {
	if (fact.subject === undefined) return undefined;
	const path = `$.${fact.subject}`;
	const stored =
		yield* sql`SELECT "seq", "payload" FROM "journal" WHERE "name" = ${fact.name} AND json_extract("payload", ${path}) IS json_extract(${payload}, ${path}) ORDER BY "seq" DESC LIMIT 1`;
	const last = stored[0];
	return last !== undefined && last.payload === payload ? Number(last.seq) : undefined;
});
