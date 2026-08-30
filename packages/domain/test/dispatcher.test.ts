import { SettingsSource } from "@antumbra/contract";
import { it as itApp } from "@antumbra/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";
import { nextBackoffMillis } from "#dispatch-policy.ts";
import { AgentDomain } from "#domain.ts";
import { dispatchingLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
} from "#test/harness.ts";
import {
	assignedPieces,
	chain,
	eventually,
	land,
	openReefVoyage,
	PATIENCE,
	retireOneAlive,
	standDownAll,
	stateOf,
} from "#test/voyage-fixtures.ts";

it("nextBackoffMillis doubles from patience and stops at five minutes", () => {
	expect(nextBackoffMillis(0, 50)).toBe(50);
	expect(nextBackoffMillis(1, 50)).toBe(100);
	expect(nextBackoffMillis(3, 50)).toBe(400);
	expect(nextBackoffMillis(20, 5000)).toBe(300000);
});

it.live("a launched chain sails on its own as outcomes land", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const { alpha, bravo, charlie, voyage } = yield* chain;
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* assignedPieces).toEqual([alpha.id]);
					expect(yield* stateOf(voyage.id, alpha.id)).toBe("active");
				}),
			);
			expect(yield* stateOf(voyage.id, bravo.id)).toBe("blocked");
			expect(yield* stateOf(voyage.id, charlie.id)).toBe("blocked");

			yield* land(alpha.id, "soundings");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* stateOf(voyage.id, bravo.id)).toBe("active");
					expect(yield* stateOf(voyage.id, charlie.id)).toBe("active");
				}),
			);

			yield* land(bravo.id, "eastern chart");
			yield* land(charlie.id, "western chart");
			// why: the outcomes are all in, but a voyage falls quiet only once its
			// crews are finished too — each piece still has a hand on it until that
			// hand says otherwise, and the farewell trails the work it landed.
			yield* standDownAll(scripted);
			const domain = yield* AgentDomain;
			const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
			expect(view.pieces.map((piece) => piece.state)).toEqual([
				"done",
				"done",
				"done",
			]);
			expect(view.state).toBe("quiet");
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);

it.effect(
	"the alive ceiling holds the second dependent until a berth frees",
	() =>
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

				yield* TestClock.withLive(retireOneAlive(scripted));
				yield* TestClock.withLive(
					eventually(
						Effect.gen(function* () {
							expect((yield* assignedPieces).length).toBe(2);
						}),
					),
				);
				yield* TestClock.adjust(300);
				expect((yield* assignedPieces).length).toBe(2);

				yield* TestClock.withLive(retireOneAlive(scripted));
				yield* TestClock.withLive(
					eventually(
						Effect.gen(function* () {
							expect((yield* assignedPieces).length).toBe(3);
						}),
					),
				);
			}).pipe(
				Effect.provide(
					dispatchingLayer(temporary, scripted.backend, {
						maxAlive: 1,
						patienceMillis: 50,
					}),
				),
			);
		}),
);

it.effect(
	"applies a saved ceiling to subsequent launches without restart",
	() =>
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

itApp.effectApp(
	"a parked piece is never dispatched until it is unparked",
	function* ({ domain, clock, eventually, db }) {
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
		const assigned = () =>
			db.PieceAgent.all().pipe(
				Effect.map((rows) => rows.map((row) => row.pieceId)),
			);
		yield* clock.adjust(300);
		expect(yield* assigned()).toEqual([]);
		expect(yield* stateOf(voyage.id, piece.id)).toBe("parked");

		yield* domain.voyages.unpark(piece.id);
		expect(yield* eventually(assigned)).toEqual([piece.id]);
	},
);
