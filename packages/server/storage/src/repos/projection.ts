import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { prune } from "#changes/refresh.ts";
import type { rows } from "#repos/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("ReposHistory.apply")(function* ({ value, requestId, streamVersion }: Event<typeof ReposEvent.Type>) {
		switch (value._tag) {
			case "RepoRegistered": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				if (
					yield* rows.repo.count({ where: { id: fact.id } }).pipe(
						Effect.map((count) => count > 0),
						Effect.orDie,
					)
				) {
					yield* rows.repo.updateVoid({ ...{ defaultRef: fact.defaultRef }, id: fact.id }).pipe(Effect.orDie);
				} else {
					yield* rows.repo.insertVoid(fact).pipe(Effect.orDie);
				}
				break;
			}
			case "RepoForgotten": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.repo.delete(fact.id).pipe(Effect.orDie);
				yield* prune();
				break;
			}
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "repo"`;
	yield* invalidateOnCommit(["repo", "repoReference"]);
});
