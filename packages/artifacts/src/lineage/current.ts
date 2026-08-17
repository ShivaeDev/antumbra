import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const currentArtifactsForPiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* Effect.filter(
			yield* db.Artifact.where({ pieceId }).all(),
			(artifact) =>
				db.ArtifactSupersession.where({
					supersededArtifactId: artifact.id,
				})
					.exists()
					.pipe(Effect.map((exists) => !exists)),
		);
	});
