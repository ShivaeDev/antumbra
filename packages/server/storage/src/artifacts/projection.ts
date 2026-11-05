import type { ArtifactsEvent } from "@antumbra/platform-vocabulary/artifacts-event.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { outcomeId } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#artifacts/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("ArtifactsHistory.apply")(function* ({ value, requestId, streamVersion }: Event<typeof ArtifactsEvent.Type>) {
		switch (value._tag) {
			case "ArtifactLanded": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.artifact
					.insertVoid({
						id: fact.id,
						pieceId: fact.pieceId,
						authorAgentId: fact.authorAgentId,
						title: fact.title,
						digest: fact.digest,
						byteSize: fact.byteSize,
						basename: fact.basename,
						supersededByArtifactId: null,
						createdAt: fact.at,
					})
					.pipe(Effect.orDie);
				if (fact.supersedesArtifactId !== null)
					yield* rows.artifact.updateVoid({ ...{ supersededByArtifactId: fact.id }, id: fact.supersedesArtifactId }).pipe(Effect.orDie);
				yield* rows.pieceOutcome
					.insertVoid({
						id: outcomeId("artifact", fact.id, fact.pieceId),
						pieceId: fact.pieceId,
						sourceKind: "artifact",
						sourceId: fact.id,
						status: "landed",
					})
					.pipe(Effect.orDie);
				break;
			}
			case "ArtifactSuperseded": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.artifact
					.updateVoid({ ...{ supersededByArtifactId: fact.successorArtifactId }, id: fact.supersededArtifactId })
					.pipe(Effect.orDie);
				break;
			}
			case "ArtifactSupersessionRemoved": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.artifact.updateVoid({ ...{ supersededByArtifactId: null }, id: fact.supersededArtifactId }).pipe(Effect.orDie);
				break;
			}
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "artifact"`;
	yield* sql`delete from "pieceOutcome" where "sourceKind" = 'artifact'`;
	yield* invalidateOnCommit(["artifact"]);
});
