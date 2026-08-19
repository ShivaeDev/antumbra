import { DomainFeeds } from "@antumbra/domain-feeds";
import { Writer } from "@antumbra/persistence";
import { Effect, PubSub } from "effect";
import { plannedEdges, writeEdges } from "#edges.ts";
import type { EdgeFailure } from "#errors.ts";
import type { PiecesReturn } from "#requirements.ts";
import { verifyPieceExists } from "#rows.ts";

export const setDependencies = Effect.fn("pieces.setDependencies")(function* (
	pieceId: string,
	dependsOn: ReadonlyArray<string>,
): PiecesReturn<void, EdgeFailure> {
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	yield* writer.write(
		Effect.gen(function* (): PiecesReturn<void, EdgeFailure> {
			yield* verifyPieceExists(pieceId);
			const edges = yield* plannedEdges(pieceId, dependsOn);
			yield* writeEdges(pieceId, edges);
		}),
	);
	yield* PubSub.publish(feeds.voyages, undefined);
});
