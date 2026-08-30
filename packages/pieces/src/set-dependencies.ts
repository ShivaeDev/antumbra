import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { plannedEdges, writeEdges } from "#edges.ts";
import { verifyPieceExists } from "#rows.ts";

export const setDependencies = Effect.fn("pieces.setDependencies")(function* (
	pieceId: string,
	dependsOn: ReadonlyArray<string>,
) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	yield* db.transaction(
		Effect.gen(function* () {
			yield* Database;
			yield* verifyPieceExists(pieceId);
			const edges = yield* plannedEdges(pieceId, dependsOn);
			yield* writeEdges(pieceId, edges);
		}),
	);
	yield* feeds.publishVoyageRefresh();
});
