import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { plannedEdges, writeEdges } from "#edges.ts";
import type { CharterInput, PieceRow } from "#model.ts";

export const charter = Effect.fn("Pieces.charter")(function* (input: CharterInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const pieceId = crypto.randomUUID();
	const row: PieceRow = {
		charter: input.charter,
		expectation: input.expectation,
		id: pieceId,
		launchedAt: null,
		parkedAt: null,
		role: input.role,
		title: input.title,
	};
	const voyages = yield* Voyages;
	yield* voyages.verifyExists(input.voyageId);
	const edges = yield* plannedEdges(pieceId, input.dependsOn);
	yield* db.Piece.create(row);
	yield* db.VoyagePiece.create({
		pieceId,
		voyageId: input.voyageId,
	});
	yield* writeEdges(pieceId, edges);
	yield* feeds.publishVoyageRefresh();
	return row;
});
