import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const currentArtifactsForPiece = Effect.fn("Artifacts.currentArtifactsForPiece")(function* (pieceId: string) {
	const db = yield* Database;
	return yield* db.Artifact.where({
		pieceId,
		supersededByArtifactId: null,
	}).all();
});
