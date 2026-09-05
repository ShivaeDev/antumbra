import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

export const assignAgent = Effect.fn("Pieces.assignAgent")(function* (pieceId: string, agentId: string) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const existing = yield* db.PieceAgent.where({ agentId, pieceId }).first();
	if (Option.isSome(existing)) {
		return;
	}
	yield* db.PieceAgent.create({ agentId, pieceId });
	yield* feeds.publishVoyageRefresh();
});
