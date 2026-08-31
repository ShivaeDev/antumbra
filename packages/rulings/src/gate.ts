import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";
import type { RulingGateInput } from "#acts.ts";
import { RulingAlreadyRuled } from "#errors.ts";
import { appendGate, requirePiece } from "#gate-rows.ts";
import { loadRuling, requireRuling } from "#read.ts";

export const gate = Effect.fn("rulings.gate")(function* (input: RulingGateInput) {
	const feeds = yield* DomainFeeds;
	const row = yield* requireRuling(input.rulingId);
	if (row.ruledAt !== null) {
		return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
	}
	yield* Effect.forEach(input.pieceIds, requirePiece);
	yield* Effect.forEach(input.pieceIds, (pieceId) => appendGate(input.rulingId, pieceId));
	const gated = yield* loadRuling(row);
	yield* feeds.publishRulingRefresh();
	yield* feeds.publishVoyageRefresh();
	return gated;
});
