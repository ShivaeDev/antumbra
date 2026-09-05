import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { ScriptedBackend } from "#test/harness.ts";
import { awaitRetirement, born, chartered, handFor, landed, MINUTE_MILLIS, sweptAt } from "#test/retire-crew-fixture.ts";

const HAND = "agent-swept";

const retireIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/retire" }).all();
});

const finishedPiece = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const { pieceId, voyageId } = yield* chartered;
		const sessionId = yield* born(handFor(HAND, pieceId, voyageId));
		yield* landed(pieceId);
		yield* endsTurn(scripted, sessionId);
		return pieceId;
	});

it.effectApp("the sweep retires a done piece's agent once its rest exceeds the threshold", function* ({ scripted }) {
	const db = yield* Database;
	yield* finishedPiece(scripted);

	yield* sweptAt(16 * MINUTE_MILLIS);

	const demanded = yield* retireIntents;
	expect(demanded).toHaveLength(1);
	expect(demanded[0]?.payload).toContain(HAND);
	yield* awaitRetirement;
	const agent = yield* db.Agent.where({ id: HAND }).first();
	expect(Option.getOrThrow(agent).status).toBe("retired");
});

it.effectApp("a done piece's agent still inside the threshold is left alone", function* ({ scripted }) {
	yield* finishedPiece(scripted);

	yield* sweptAt(14 * MINUTE_MILLIS);

	expect(yield* retireIntents).toEqual([]);
});

it.effectApp("a piece not yet done is never swept however long its agent rests", function* ({ scripted }) {
	const { pieceId, voyageId } = yield* chartered;
	const sessionId = yield* born(handFor(HAND, pieceId, voyageId));
	yield* endsTurn(scripted, sessionId);

	yield* sweptAt(24 * 60 * MINUTE_MILLIS);

	expect(yield* retireIntents).toEqual([]);
});

it.effectApp("the sweep does nothing when the flag setting is off", function* ({ scripted }) {
	const settings = yield* SettingsSource;
	yield* finishedPiece(scripted);
	yield* settings.change({ key: "retireSweep", value: false });

	yield* sweptAt(60 * MINUTE_MILLIS);

	expect(yield* retireIntents).toEqual([]);
});

it.effectApp("the threshold honors a changed setting on the next pass", function* ({ scripted }) {
	const settings = yield* SettingsSource;
	yield* finishedPiece(scripted);

	yield* sweptAt(6 * MINUTE_MILLIS);
	expect(yield* retireIntents).toEqual([]);

	yield* settings.change({ key: "retireRestMinutes", value: 5 });
	yield* sweptAt(6 * MINUTE_MILLIS);

	expect(yield* retireIntents).toHaveLength(1);
});
