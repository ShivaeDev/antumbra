import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { changeOf } from "#test/change-fixtures.ts";
import type { ScriptedBackend } from "#test/harness.ts";
import { awaitRetirement, born, chartered, handFor, landed, MINUTE_MILLIS, swept, sweptAt } from "#test/retire-crew-fixture.ts";
import { stateOf } from "#test/voyage-fixtures.ts";

const HAND = "agent-written-off";

const retireIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/retire" }).all();
});

const statusOf = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const agent = yield* db.Agent.where({ id: agentId }).first();
		return Option.getOrThrow(agent).status;
	});

const closedWithoutVerdict = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const { pieceId, voyageId } = yield* chartered;
		const sessionId = yield* born(handFor(HAND, pieceId, voyageId));
		yield* landed(pieceId);
		yield* endsTurn(scripted, sessionId);
		yield* Effect.all([
			db.Change.create(
				changeOf({
					headRef: `work/${HAND}/berth-0`,
					id: "change-closed",
					repoId: "repo-reef",
					stage: "withdrawn",
				}),
			),
			db.PieceChange.create({ changeId: "change-closed", pieceId }),
		]);
		return { pieceId, voyageId };
	});

it.effectApp("a piece whose change merely closed waits out the ordinary rest", function* ({ scripted }) {
	const db = yield* Database;
	const { pieceId, voyageId } = yield* closedWithoutVerdict(scripted);
	expect(yield* db.PieceChange.where({ pieceId }).all()).toHaveLength(1);
	expect(yield* stateOf(voyageId, pieceId)).toBe("done");
	expect(yield* db.PieceVerdict.all()).toEqual([]);

	yield* swept;
	expect(yield* retireIntents).toEqual([]);
	expect(yield* statusOf(HAND)).toBe("alive");

	yield* sweptAt(16 * MINUTE_MILLIS);
	expect(yield* retireIntents).toHaveLength(1);
});

it.effectApp("an abandoned piece's working crew is left alone until it stops", function* ({ scripted }) {
	const pieces = yield* Pieces;
	const { pieceId, voyageId } = yield* chartered;
	const sessionId = yield* born(handFor(HAND, pieceId, voyageId));
	yield* pieces.landVerdict(pieceId, "abandoned");

	yield* sweptAt(24 * 60 * MINUTE_MILLIS);

	expect(yield* retireIntents).toEqual([]);
	expect(yield* statusOf(HAND)).toBe("alive");

	yield* endsTurn(scripted, sessionId);
	yield* swept;

	expect(yield* retireIntents).toHaveLength(1);
	yield* awaitRetirement;
	expect(yield* statusOf(HAND)).toBe("retired");
});
