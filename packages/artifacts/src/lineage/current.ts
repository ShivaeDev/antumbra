import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { requireArtifact } from "#lineage/validation.ts";

export const currentArtifactsForPiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const links = yield* db.PieceArtifact.where({ pieceId }).all();
		const superseded = new Set(
			(yield* db.ArtifactSupersession.all()).map(
				(edge) => edge.supersededArtifactId,
			),
		);
		return yield* Effect.forEach(
			links.filter((link) => !superseded.has(link.artifactId)),
			(link) => requireArtifact(link.artifactId),
		);
	});
