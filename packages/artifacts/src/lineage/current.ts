import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const currentArtifactsForPiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.Artifact.where({
			pieceId,
			supersededByArtifactId: null,
		}).all();
	});
