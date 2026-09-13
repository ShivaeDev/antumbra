import type { StoredFact } from "@antumbra/platform-feature/migration.ts";
import { Cause, Effect, Schema } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { Registry, RunnableMigration } from "#app.ts";
import { materialize } from "#materialize.ts";
import { storedFact } from "#migrate.ts";

const undecodable = (fact: StoredFact, migration: RunnableMigration | undefined): string =>
	migration === undefined
		? `the fact "${fact.name}" at seq ${fact.seq} does not decode`
		: `the fact "${fact.name}" at seq ${fact.seq} does not decode after fact migration ${migration.number} of "${migration.feature}"`;

export const replay = Effect.fn("Journal.replay")(function* (
	sql: SqlClient,
	registry: Registry,
	rewritten: ReadonlyMap<number, RunnableMigration>,
	dirty: (key: string) => void,
) {
	const entries = yield* sql`SELECT "seq", "at", "requestId", "name", "payload" FROM "journal" ORDER BY "seq"`;
	for (const entry of entries) {
		const fact = yield* storedFact(entry);
		const source = registry.materializers.get(fact.name);
		if (source === undefined) return yield* Effect.die(new Error(`no materializer declares the fact "${fact.name}"`));
		const decoded = yield* Schema.decodeUnknownEffect(source.fact.Payload)(fact.payload).pipe(
			Effect.catchCause((cause) => Effect.die(new Error(`${undecodable(fact, rewritten.get(fact.seq))}: ${Cause.squash(cause)}`))),
		);
		yield* materialize(sql, registry, fact.name, { ...decoded, at: fact.at, requestId: fact.requestId, seq: fact.seq }, dirty);
	}
});
