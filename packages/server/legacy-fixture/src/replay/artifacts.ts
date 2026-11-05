import { ArtifactsEvent } from "@antumbra/platform-vocabulary/artifacts-event.ts";
import { artifact } from "@antumbra/server-storage/artifacts/rows.ts";
import { ArtifactsHistory } from "@antumbra/server-storage/artifacts/service.ts";
import { selection as artifactSelection } from "@antumbra/server-storage/records/artifact.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalArtifacts = Effect.fn("ArtifactsFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
	const events = yield* legacyEvents(ArtifactsEvent, ["ArtifactLanded", "ArtifactSuperseded", "ArtifactSupersessionRemoved"]).pipe(
		Effect.provideService(SqlClient.SqlClient, source),
	);
	return { events, artifact: yield* legacyRows(artifact).pipe(Effect.provideService(SqlClient.SqlClient, source)) };
});
export const replayArtifactsFixture = Effect.fn("ArtifactsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalArtifacts>>) {
	const history = yield* ArtifactsHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	const rows = yield* history.rows();
	if (
		!Schema.toEquivalence(Schema.Array(artifact.Row))(
			snapshot.artifact,
			yield* rows.artifact
				.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: artifactSelection })
				.pipe(Effect.orDie),
		)
	)
		return yield* Effect.fail(new ArtifactsFixtureMismatch({ message: "Artifacts history does not reproduce captured rows" }));
	return { artifacts: snapshot.events.length, events: snapshot.events.length };
});
export class ArtifactsFixtureMismatch extends Schema.TaggedError<ArtifactsFixtureMismatch>()("ArtifactsFixtureMismatch", {
	message: Schema.String,
}) {}
