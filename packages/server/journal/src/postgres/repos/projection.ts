import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { prune } from "#postgres/changes/refresh.ts";
import type { rows } from "#postgres/repos/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("ReposHistory.apply")(function* ({ value, requestId, streamVersion }: Event<typeof ReposEvent.Type>) {
		switch (value._tag) {
			case "RepoReferencesObserved": {
				for (const held of yield* rows.repoReference.where({})) yield* rows.repoReference.delete(held.id);
				for (const reference of value.references) yield* rows.repoReference.insert(reference);
				break;
			}
			case "RepoRegistered": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				if (yield* rows.repo.exists(fact.id)) {
					yield* rows.repo.update(fact.id, { defaultRef: fact.defaultRef });
				} else {
					yield* rows.repo.insert(fact);
				}
				break;
			}
			case "RepoForgotten": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.repo.delete(fact.id);
				yield* prune();
				break;
			}
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra."repo"`;
	yield* sql`delete from antumbra."repoReference"`;
	yield* invalidateOnCommit(["repo", "repoReference"]);
});
