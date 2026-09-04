import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";
import { plannedEdges, writeEdges } from "#edges.ts";
import { verifyPieceExists } from "#rows.ts";

export const setDependencies = Effect.fn("Pieces.setDependencies")(function* (pieceId: string, dependsOn: ReadonlyArray<string>) {
	const feeds = yield* DomainFeeds;
	yield* verifyPieceExists(pieceId);
	const edges = yield* plannedEdges(pieceId, dependsOn);
	yield* writeEdges(pieceId, edges);
	yield* feeds.publishVoyageRefresh();
});
