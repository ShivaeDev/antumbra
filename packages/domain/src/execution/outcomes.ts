import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Effect } from "effect";
import { byId } from "#voyage-row-projection.ts";

export const readOutcomes = Effect.fnUntraced(function* (pieceIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const changes = yield* Changes;
	const pieces = yield* Pieces;
	return {
		...(yield* changes.forPieces(pieceIds)),
		artifacts: byId(yield* db.Artifact.where((artifact) => artifact.pieceId.in(pieceIds)).all()),
		pieceReports: yield* db.PieceReport.where((report) => report.pieceId.in(pieceIds)).all(),
		pieceVerdicts: yield* pieces.verdicts(pieceIds),
	};
});
