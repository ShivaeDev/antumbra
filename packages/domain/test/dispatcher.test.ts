import { SettingsSource } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { nextBackoffMillis } from "#dispatch-policy.ts";
import { AgentDomain } from "#domain.ts";
import { dispatchingLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";
import { assignedPieces, chain, eventually, land, openReefVoyage, PATIENCE, standDownOneAlive, stateOf } from "#test/voyage-fixtures.ts";

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
			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect(yield* assignedPieces).toEqual([alpha.id]);
					}),
				),
			);
			yield* land(alpha.id, "soundings");
			yield* TestClock.adjust(300);
			expect(yield* assignedPieces).toEqual([alpha.id]);

			yield* TestClock.withLive(standDownOneAlive(scripted));
			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect((yield* assignedPieces).length).toBe(2);
					}),
				),
			);
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
			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect(yield* assignedPieces).toEqual([alpha.id]);
					}),
				),
			);
			yield* land(alpha.id, "soundings");
			yield* TestClock.adjust(150);
			expect(yield* assignedPieces).toEqual([alpha.id]);

			yield* settings.change({ key: "maxParallelSessions", value: 2 });
			yield* TestClock.adjust(50);
			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect((yield* assignedPieces).length).toBe(2);
					}),
				),
			);
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
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			yield* domain.voyages.park(piece.id);
			yield* domain.voyages.launch(piece.id);
			yield* TestClock.adjust(300);
			expect(yield* assignedPieces).toEqual([]);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("parked");

			yield* domain.voyages.unpark(piece.id);
			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect(yield* assignedPieces).toEqual([piece.id]);
					}),
				),
			);
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)));
	}),
);
