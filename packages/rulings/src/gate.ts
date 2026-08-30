import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RulingGateInput } from "#acts.ts";
import { RulingAlreadyRuled } from "#errors.ts";
import { appendGate, requirePiece } from "#gate-rows.ts";
import { loadRuling, requireRuling } from "#read.ts";

const writeGates = (input: RulingGateInput) =>
	Effect.gen(function* () {
		const row = yield* requireRuling(input.rulingId);
		if (row.ruledAt !== null) {
			return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
		}
		yield* Effect.forEach(input.pieceIds, requirePiece);
		yield* Effect.forEach(input.pieceIds, (pieceId) => appendGate(input.rulingId, pieceId));
		return yield* loadRuling(row);
	});

// why: a ruled ruling gates nothing, so naming one refuses the whole write
// rather than hanging a piece on an answer the fleet already has; a piece the
// fleet lost refuses it before any row lands.
export const gate = Effect.fn("rulings.gate")(function* (input: RulingGateInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const gated = yield* db.transaction(writeGates(input));
	yield* feeds.publishRulingRefresh();
	yield* feeds.publishVoyageRefresh();
	return gated;
});
