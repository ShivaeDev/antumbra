import { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { repo, repoReference } from "@antumbra/server-storage/repos/rows.ts";
import { ReposHistory } from "@antumbra/server-storage/repos/service.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalRepos = Effect.fn("ReposFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
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
	const rows = yield* history.rows();
	if (
		!Schema.toEquivalence(Schema.Array(repo.Row))(
			snapshot.repo,
			yield* rows.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie),
		)
	)
		return yield* Effect.fail(new ReposFixtureMismatch({ message: "Repos history does not reproduce captured rows" }));
	return { repos: snapshot.events.length, events: snapshot.events.length };
});
export class ReposFixtureMismatch extends Schema.TaggedError<ReposFixtureMismatch>()("ReposFixtureMismatch", { message: Schema.String }) {}
