import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { RulingAlreadyRuled, RulingGatePieceMissing } from "#errors.ts";
import type { RulingGateInput } from "#model.ts";
import { loadRuling, requireRuling } from "#read.ts";

const requirePiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (!(yield* db.Piece.where({ id: pieceId }).exists())) {
			return yield* new RulingGatePieceMissing({ pieceId });
		}
	});

const appendGate = (rulingId: string, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const held = yield* db.RulingGate.where({ pieceId, rulingId }).exists();
		if (!held) {
			yield* db.RulingGate.create({
				id: crypto.randomUUID(),
				pieceId,
				rulingId,
			});
		}
	});

const writeGates = (input: RulingGateInput) =>
	Effect.gen(function* () {
		const row = yield* requireRuling(input.rulingId);
		if (row.ruledAt !== null) {
			return yield* new RulingAlreadyRuled({ rulingId: input.rulingId });
		}
		yield* Effect.forEach(input.pieceIds, requirePiece);
		yield* Effect.forEach(input.pieceIds, (pieceId) =>
			appendGate(input.rulingId, pieceId),
		);
		return yield* loadRuling(row);
	});

// why: a ruled ruling gates nothing, so naming one refuses the whole write
// rather than hanging a piece on an answer the fleet already has; a piece the
// fleet lost refuses it before any row lands. Naming a piece twice is the same
// demand said twice and lands the one row.
export const gate = Effect.fn("rulings.gate")(function* (
	input: RulingGateInput,
) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const gated = yield* db.transaction(writeGates(input));
	yield* feeds.publishRulingRefresh();
	yield* feeds.publishVoyageRefresh();
	return gated;
});
