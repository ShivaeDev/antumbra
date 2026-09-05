import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { aliveAgent, chain, land, openReefVoyage, stateOf, terminalIntent } from "#test/voyage-fixtures.ts";

const soleReefPiece = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const voyage = yield* openReefVoyage;
	const piece = yield* pieces.charter({
		charter: "sound the eastern shoal",
		dependsOn: [],
		expectation: "the depths are recorded",
		role: "hand",
		title: "soundings",
		voyageId: voyage.id,
	});
	yield* pieces.launch(piece.id);
	return { piece, voyage };
});

it.effectApp("a delivered verdict is an outcome and the ladder reads done", function* () {
	const pieces = yield* Pieces;
	const db = yield* Database;
	const { piece, voyage } = yield* soleReefPiece;
	expect(yield* stateOf(voyage.id, piece.id)).toBe("ready");

	yield* pieces.landVerdict(piece.id, "delivered");

	expect(yield* db.PieceVerdict.all()).toMatchObject([{ pieceId: piece.id, verdict: "delivered" }]);
	expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
});

it.effectApp("an abandoned piece says so rather than passing for landed work", function* () {
	const pieces = yield* Pieces;
	const domain = yield* AgentDomain;
	const { piece, voyage } = yield* soleReefPiece;

	yield* pieces.landVerdict(piece.id, "abandoned");

	expect(yield* stateOf(voyage.id, piece.id)).toBe("abandoned");
	const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
	expect(view.counts.abandoned).toBe(1);
	expect(view.counts.done).toBe(0);
});

it.effectApp("a corrected verdict replaces the one standing, never joins it", function* () {
	const pieces = yield* Pieces;
	const db = yield* Database;
	const { piece, voyage } = yield* soleReefPiece;

	yield* pieces.landVerdict(piece.id, "abandoned");
	yield* pieces.landVerdict(piece.id, "delivered");

	expect(yield* db.PieceVerdict.all()).toHaveLength(1);
	expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
	expect(yield* Effect.flip(pieces.landVerdict("no-such-piece", "delivered"))).toMatchObject({ _tag: "PieceNotFound" });
});

it.effectApp("abandoning a piece releases what was waiting behind it", function* () {
	const pieces = yield* Pieces;
	const { alpha, bravo, voyage } = yield* chain;
	expect(yield* stateOf(voyage.id, bravo.id)).toBe("blocked");

	yield* pieces.landVerdict(alpha.id, "abandoned");

	expect(yield* stateOf(voyage.id, alpha.id)).toBe("abandoned");
	expect(yield* stateOf(voyage.id, bravo.id)).toBe("ready");
});

it.effectApp("a piece the ladder has finished with can still be asked to run", { clock: "live" }, function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const { piece, voyage } = yield* soleReefPiece;
	yield* land(piece.id, "soundings");
	expect(yield* stateOf(voyage.id, piece.id)).toBe("done");

	const crewed = yield* domain.voyages.workNow(piece.id);

	expect(yield* terminalIntent(crewed.intentId)).toBe("succeeded");
	yield* aliveAgent(crewed.agentId);
	expect(yield* db.PieceAgent.all()).toMatchObject([{ agentId: crewed.agentId, pieceId: piece.id }]);
	expect(yield* stateOf(voyage.id, piece.id)).toBe("active");
	expect(yield* Effect.flip(domain.voyages.workNow(piece.id))).toMatchObject({ _tag: "PieceAlreadyCrewed" });
});

it.effectApp("an abandoned piece refuses crew until its verdict changes", function* () {
	const pieces = yield* Pieces;
	const domain = yield* AgentDomain;
	const { piece } = yield* soleReefPiece;
	yield* pieces.landVerdict(piece.id, "abandoned");

	expect(yield* Effect.flip(domain.voyages.workNow(piece.id))).toMatchObject({ _tag: "PieceAbandoned" });
	expect(yield* Effect.flip(domain.voyages.workNow("no-such-piece"))).toMatchObject({ _tag: "PieceNotFound" });
});
