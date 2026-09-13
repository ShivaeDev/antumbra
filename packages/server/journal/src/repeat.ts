import type { FactShape } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";

const Fields = Schema.Record(Schema.String, Schema.Unknown);

export const subjectOf = Effect.fn("journal.subjectOf")(function* (fact: FactShape, encoded: unknown) {
	if (fact.subject === undefined) return null;
	const fields = yield* Schema.decodeUnknownEffect(Fields)(encoded);
	const value = fields[fact.subject];
	return value === undefined || value === null ? null : String(value);
});

export const repeatOf = Effect.fn("journal.repeatOf")(function* (sql: SqlClient, fact: FactShape, subject: string | null, payload: string) {
	if (subject === null) return undefined;
	const stored =
		yield* sql`SELECT "seq", "payload" FROM "journal" WHERE "name" = ${fact.name} AND "subject" = ${subject} ORDER BY "seq" DESC LIMIT 1`;
	const last = stored[0];
	return last !== undefined && last.payload === payload ? Number(last.seq) : undefined;
});
