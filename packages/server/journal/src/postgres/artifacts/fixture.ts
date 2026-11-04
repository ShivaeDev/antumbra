import { ArtifactsEvent } from "@antumbra/platform-vocabulary/artifacts-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { reset } from "#postgres/artifacts/projection.ts";
import { artifact } from "#postgres/artifacts/rows.ts";
import { ArtifactsHistory } from "#postgres/artifacts/service.ts";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
export const journalArtifacts = Effect.fn("ArtifactsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(ArtifactsEvent, ["ArtifactLanded", "ArtifactSuperseded", "ArtifactSupersessionRemoved"]).pipe(
		Effect.provideService(SqlClient.SqlClient, source),
	);
	return { events, artifact: yield* legacyRows(artifact).pipe(Effect.provideService(SqlClient.SqlClient, source)) };
});
export const replayArtifactsFixture = Effect.fn("ArtifactsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalArtifacts>>) {
	const history = yield* ArtifactsHistory;
	yield* reset;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	if (!Schema.toEquivalence(Schema.Array(artifact.Row))(snapshot.artifact, yield* rows.artifact.where({})))
		return yield* Effect.fail(new ArtifactsFixtureMismatch({ message: "Artifacts history does not reproduce captured rows" }));
	return { artifacts: snapshot.events.length, events: snapshot.events.length };
});
export class ArtifactsFixtureMismatch extends Schema.TaggedError<ArtifactsFixtureMismatch>()("ArtifactsFixtureMismatch", {
	message: Schema.String,
}) {}
