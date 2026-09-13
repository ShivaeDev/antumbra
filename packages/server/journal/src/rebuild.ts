import { Effect } from "effect";
import type { CommitContext } from "#commit.ts";
import { scopeKey, tableKey } from "#keys.ts";
import { replay } from "#replay.ts";

export const rebuild = Effect.fn("Journal.rebuild")(function* (context: CommitContext) {
	yield* context.backup;
	const sql = context.sql;
	const dirty = new Set<string>();
	yield* sql
		.withTransaction(
			Effect.gen(function* () {
				for (const row of context.registry.rows) {
					dirty.add(tableKey(row.name));
					if (row.scope !== undefined) {
						const scopes = yield* sql`SELECT DISTINCT ${sql(row.scope)} AS "scope" FROM ${sql(row.name)}`;
						for (const scope of scopes) {
							if (scope.scope !== null && scope.scope !== undefined) dirty.add(scopeKey(row.name, scope.scope));
						}
					}
					yield* sql`DELETE FROM ${sql(row.name)}`;
				}
				yield* replay(sql, context.registry, new Map(), (key) => dirty.add(key));
			}),
		)
		.pipe(Effect.orDie);
	yield* context.reactivity.invalidate([...dirty]);
});
