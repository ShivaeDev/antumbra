import { SettingsSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { endsTurn } from "@antumbra/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";
import { nextBackoffMillis } from "#dispatch-policy.ts";
import { dispatchingLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend } from "#test/harness.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";
import { assignedPieces, chain, land, openReefVoyage, PATIENCE, stateOf } from "#test/voyage-fixtures.ts";

const nextDispatched = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const input = yield* scripted.queued;
		const db = yield* Database;
		const kernel = yield* Kernel;
		const births = yield* db.Intent.where({ tag: "agent/spawn" }).all();
		expect(births.length).toBeGreaterThan(0);
		for (const birth of births) {
			expect(yield* untilTerminal(kernel.changes(birth.id))).toBe("succeeded");
		}
		return Option.getOrThrow(yield* db.AgentSession.where({ id: input.sessionId }).first());
	});

it("nextBackoffMillis doubles from patience and stops at five minutes", () => {
	expect(nextBackoffMillis(0, 50)).toBe(50);
	expect(nextBackoffMillis(1, 50)).toBe(100);
	expect(nextBackoffMillis(3, 50)).toBe(400);
	expect(nextBackoffMillis(20, 5000)).toBe(300000);
});

it.effect("an idle agent does not hold a dispatch berth", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const { alpha } = yield* chain;
			const initial = yield* nextDispatched(scripted);
			expect(yield* assignedPieces).toEqual([alpha.id]);
			yield* land(alpha.id, "soundings");
			yield* TestClock.adjust(300);
			expect(yield* assignedPieces).toEqual([alpha.id]);

			yield* endsTurn(scripted, initial.id);
			yield* nextDispatched(scripted);
			expect(yield* assignedPieces).toHaveLength(2);
		}).pipe(
			Effect.provide(
				dispatchingLayer(temporary, scripted.backend, {
					maxRunning: 1,
					patienceMillis: 50,
				}),
			),
		);
	}),
);

it.effect("applies a saved ceiling to subsequent launches without restart", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const settings = yield* SettingsSource;
			yield* settings.change({ key: "maxParallelSessions", value: 1 });
			const { alpha } = yield* chain;
			yield* nextDispatched(scripted);
			expect(yield* assignedPieces).toEqual([alpha.id]);
			yield* land(alpha.id, "soundings");
			yield* TestClock.adjust(150);
			expect(yield* assignedPieces).toEqual([alpha.id]);

			yield* settings.change({ key: "maxParallelSessions", value: 2 });
			yield* TestClock.adjust(50);
			yield* nextDispatched(scripted);
			expect(yield* assignedPieces).toHaveLength(2);
		}).pipe(
			Effect.provide(
				dispatchingLayer(temporary, scripted.backend, {
					patienceMillis: 50,
				}),
			),
		);
	}),
);

it.effect("a parked piece is never dispatched until it is unparked", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyage = yield* openReefVoyage;
			const piece = yield* pieces.charter({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			yield* pieces.park(piece.id, true);
			yield* pieces.launch(piece.id);
			yield* TestClock.adjust(300);
			expect(yield* assignedPieces).toEqual([]);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("parked");

			yield* pieces.park(piece.id, false);
			yield* nextDispatched(scripted);
			expect(yield* assignedPieces).toEqual([piece.id]);
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)));
	}),
);
