import { row } from "@antumbra/platform-feature/row.ts";
import { Artifact } from "@antumbra/platform-vocabulary/artifacts.ts";
import { Piece } from "@antumbra/platform-vocabulary/piece.ts";
import { PieceOutcome } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { Effect } from "effect";
import { rowsOf } from "#postgres/rows.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
export const pieceOutcome = row("pieceOutcome", PieceOutcome.fields, { key: "id", scope: "pieceId" });
const externalpiece = rowsOf(piece, "pieces", "chartered_order");
const externalpieceOutcome = rowsOf(pieceOutcome, "piece_outcomes", "id");

export const artifact = row("artifact", Artifact.fields, { key: "id", scope: "pieceId" });
export const rows = Effect.gen(function* () {
	return { artifact: yield* rowsOf(artifact, "artifact", "storage_order"), piece: yield* externalpiece, pieceOutcome: yield* externalpieceOutcome };
});
