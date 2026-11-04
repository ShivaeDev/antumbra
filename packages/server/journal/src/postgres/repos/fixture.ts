import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
import { repo, repoReference } from "#postgres/repos/rows.ts";
import { ReposHistory } from "#postgres/repos/service.ts";
export const journalRepos = Effect.fn("ReposFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(ReposEvent, ["RepoRegistered", "RepoForgotten"]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return {
		events,
		repo: yield* legacyRows(repo).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		repoReference: yield* legacyRows(repoReference).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayReposFixture = Effect.fn("ReposFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalRepos>>) {
	const history = yield* ReposHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.append(Request.make("fixture:repo-references"), [{ _tag: "RepoReferencesObserved", references: snapshot.repoReference, at: 0 }]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(repo.Row))(snapshot.repo, yield* rows.repo.where({})) &&
			Schema.toEquivalence(Schema.Array(repoReference.Row))(snapshot.repoReference, yield* rows.repoReference.where({}))
		)
	)
		return yield* Effect.fail(new ReposFixtureMismatch({ message: "Repos history does not reproduce captured rows" }));
	return { repos: snapshot.events.length, events: snapshot.events.length };
});
export class ReposFixtureMismatch extends Schema.TaggedError<ReposFixtureMismatch>()("ReposFixtureMismatch", { message: Schema.String }) {}
