import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { changeOf } from "#test/change-fixtures.ts";
import { endTurn, type ScriptedBackend } from "#test/harness.ts";
import { born, chartered, handFor, landed, MINUTE_MILLIS, swept, sweptAt } from "#test/retire-crew-fixture.ts";
import { eventually } from "#test/session-recovery-fixture.ts";
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

const writtenOffPiece = (scripted: ScriptedBackend, quiet: boolean) =>
	Effect.gen(function* () {
		const pieces = yield* Pieces;
		const { pieceId, voyageId } = yield* chartered;
		yield* born(handFor(HAND, pieceId, voyageId));
		if (quiet) {
			yield* endTurn(scripted, HAND);
		}
		yield* pieces.landVerdict(pieceId, "abandoned");
		return pieceId;
	});

const closedWithoutVerdict = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const { pieceId, voyageId } = yield* chartered;
		yield* born(handFor(HAND, pieceId, voyageId));
		yield* landed(pieceId);
		yield* endTurn(scripted, HAND);
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

it.effectApp("a piece whose change merely closed waits out the ordinary rest", { clock: "live" }, function* ({ scripted }) {
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

it.effectApp("an abandoned piece's working crew is left alone until it stops", { clock: "live" }, function* ({ scripted }) {
	yield* writtenOffPiece(scripted, false);

	yield* sweptAt(24 * 60 * MINUTE_MILLIS);

	expect(yield* retireIntents).toEqual([]);
	expect(yield* statusOf(HAND)).toBe("alive");

	yield* endTurn(scripted, HAND);
	yield* swept;

	expect(yield* retireIntents).toHaveLength(1);
	yield* eventually(
		Effect.gen(function* () {
			expect(yield* statusOf(HAND)).toBe("retired");
		}),
	);
});
