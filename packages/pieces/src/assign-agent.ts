import type { DomainFeeds } from "@antumbra/domain-feeds";
import type { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

type Store = Effect.Success<typeof Database>;

type Feeds = Effect.Success<typeof DomainFeeds>;

export const assigningAgent = (store: Store, feeds: Feeds) =>
	Effect.fn("Pieces.assignAgent")(function* (pieceId: string, agentId: string) {
		const existing = yield* store.PieceAgent.where({ agentId, pieceId }).first();
		if (Option.isSome(existing)) {
			return;
		}
		yield* store.PieceAgent.create({ agentId, pieceId });
		yield* feeds.publishVoyageRefresh();
	}, Effect.orDie);
