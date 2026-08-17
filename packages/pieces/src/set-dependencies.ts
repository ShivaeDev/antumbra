import { DomainFeeds } from "@antumbra/domain-feeds";
import { Writer } from "@antumbra/persistence";
import { Effect, PubSub } from "effect";
import { plannedEdges, writeEdges } from "#edges.ts";
import { verifyPieceExists } from "#rows.ts";

export const setDependencies = (
	pieceId: string,
	dependsOn: ReadonlyArray<string>,
) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		yield* writer.write(
			Effect.gen(function* () {
				yield* verifyPieceExists(pieceId);
				const edges = yield* plannedEdges(pieceId, dependsOn);
				yield* writeEdges(pieceId, edges);
			}),
		);
		yield* PubSub.publish(feeds.voyages, undefined);
	});
