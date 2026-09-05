import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { assignedPieces, eventually, openReefVoyage, stateOf } from "#test/voyage-fixtures.ts";

const askerId = "agent-asker";

const requestedRuling = Effect.gen(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	yield* db.Agent.create({
		charter: "sound the shallows",
		id: askerId,
		role: "hand",
		status: "alive",
	});
	return yield* rulings.request({
		choices: [],
		context: "the reef chart disagrees with the soundings",
		gates: [],
		question: "which reading do we trust?",
		radius: "voyage",
		requester: { agentId: askerId, kind: "agent" },
		rung: "admiral",
		subjects: [],
		urgency: "pressing",
	});
});

it.effectApp("a gated piece is not dispatched until its ruling lands", function* () {
	const pieces = yield* Pieces;
	const rulings = yield* Rulings;
	const voyage = yield* openReefVoyage;
	const piece = yield* pieces.charter({
		charter: "sound the shallows",
		dependsOn: [],
		expectation: "soundings are landed",
		role: "hand",
		title: "alpha",
		voyageId: voyage.id,
	});
	const ruling = yield* requestedRuling;
	yield* rulings.gate({ pieceIds: [piece.id], rulingId: ruling.id });
	yield* pieces.launch(piece.id);
	yield* TestClock.adjust(300);
	expect(yield* assignedPieces).toEqual([]);
	expect(yield* stateOf(voyage.id, piece.id)).toBe("blocked");

	yield* rulings.rule({
		answer: "trust the soundings",
		by: "admiral",
		rulingId: ruling.id,
	});
	yield* TestClock.withLive(
		eventually(
			Effect.gen(function* () {
				expect(yield* assignedPieces).toEqual([piece.id]);
			}),
		),
	);
});
