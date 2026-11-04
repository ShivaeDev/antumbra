import type { ArtifactsEvent } from "@antumbra/platform-vocabulary/artifacts-event.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { outcomeId } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#postgres/artifacts/rows.ts";
import { projectProgress } from "#postgres/pieces/progress.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("ArtifactsHistory.apply")(function* ({ value, requestId, streamVersion }: Event<typeof ArtifactsEvent.Type>) {
		switch (value._tag) {
			case "ArtifactLanded": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.artifact.insert({
					id: fact.id,
					pieceId: fact.pieceId,
					authorAgentId: fact.authorAgentId,
					title: fact.title,
					digest: fact.digest,
					byteSize: fact.byteSize,
					basename: fact.basename,
					supersededByArtifactId: null,
					createdAt: fact.at,
				});
				if (fact.supersedesArtifactId !== null) yield* rows.artifact.update(fact.supersedesArtifactId, { supersededByArtifactId: fact.id });
				yield* rows.pieceOutcome.insert({
					id: outcomeId("artifact", fact.id, fact.pieceId),
					pieceId: fact.pieceId,
					sourceKind: "artifact",
					sourceId: fact.id,
					status: "landed",
				});
				break;
			}
			case "ArtifactSuperseded": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.artifact.update(fact.supersededArtifactId, { supersededByArtifactId: fact.successorArtifactId });
				break;
			}
			case "ArtifactSupersessionRemoved": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.artifact.update(fact.supersededArtifactId, { supersededByArtifactId: null });
				break;
			}
		}
		yield* projectProgress();
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra."artifact"`;
	yield* sql`delete from antumbra.piece_outcomes where "sourceKind" = 'artifact'`;
	yield* invalidateOnCommit(["artifact"]);
});
