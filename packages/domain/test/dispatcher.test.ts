import { type IntentStatus, Kernel, maxConcurrency } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Schedule, Stream } from "effect";
import { nextBackoffMillis } from "#dispatch-policy.ts";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	dispatchingLayer,
	makeScriptedBackend,
} from "#test/harness.ts";

const PATIENCE = { maxAlive: 4, patienceMillis: 50 };

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 3000 }))),
	);

const chain = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const voyage = yield* domain.voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const charter = (title: string, dependsOn: ReadonlyArray<string>) =>
		domain.voyages.charterPiece({
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId: voyage.id,
		});
	const alpha = yield* charter("alpha", []);
	const bravo = yield* charter("bravo", [alpha.id]);
	const charlie = yield* charter("charlie", [alpha.id]);
	yield* domain.voyages.launch(alpha.id);
	yield* domain.voyages.launch(bravo.id);
	yield* domain.voyages.launch(charlie.id);
	return { alpha, bravo, charlie, voyage };
});

const stateOf = (voyageId: string, pieceId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const view = Option.getOrThrow(yield* domain.voyages.read(voyageId));
		return view.pieces.find((piece) => piece.id === pieceId)?.state;
	});

const land = (pieceId: string, title: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		yield* domain.voyages.landReport({
			body: `${title} landed`,
			pieceId,
			title,
		});
	});

const assignedPieces = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.PieceAgent.all()).map((row) => row.pieceId);
});

const retireOneAlive = Effect.gen(function* () {
	const db = yield* Database;
	const kernel = yield* Kernel;
	const domain = yield* AgentDomain;
	const alive = yield* db.Agent.where({ status: "alive" }).all();
	const submission = yield* kernel.submit(domain.retire, {
		agentId: alive[0]?.id ?? "",
	});
	return yield* submission.changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
	);
});

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

it.live(
	"the alive ceiling holds the second dependent until a berth frees",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const { alpha } = yield* chain;
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* assignedPieces).toEqual([alpha.id]);
					}),
				);
				yield* land(alpha.id, "soundings");
				yield* Effect.sleep(300);
				expect(yield* assignedPieces).toEqual([alpha.id]);

				yield* retireOneAlive;
				yield* eventually(
					Effect.gen(function* () {
						expect((yield* assignedPieces).length).toBe(2);
					}),
				);
				yield* Effect.sleep(300);
				expect((yield* assignedPieces).length).toBe(2);

				yield* retireOneAlive;
				yield* eventually(
					Effect.gen(function* () {
						expect((yield* assignedPieces).length).toBe(3);
					}),
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

it.live("a parked piece is never dispatched until it is unparked", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* domain.voyages.open({
				backend: "scripted",
				context: "the reef is uncharted",
				name: "Chart the reef",
				northStar: "every shoal is known",
			});
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
			yield* Effect.sleep(300);
			expect(yield* assignedPieces).toEqual([]);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("parked");

			yield* domain.voyages.unpark(piece.id);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* assignedPieces).toEqual([piece.id]);
				}),
			);
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);

it.live("a spawn held at admission is never submitted twice", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* chain;
			yield* Effect.sleep(400);
			const spawns = yield* db.Intent.where({ tag: "agent/spawn" }).all();
			expect(spawns).toHaveLength(1);
			expect(spawns[0]?.status).toBe("queued");
		}).pipe(
			Effect.provide(
				dispatchingLayer(temporary, scripted.backend, PATIENCE, {
					gates: [maxConcurrency(0)],
				}),
			),
		);
	}),
);

it.live("a piece whose agent the crash left behind is dispatched again", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const layer = dispatchingLayer(temporary, scripted.backend, PATIENCE);
		yield* Effect.gen(function* () {
			const { alpha } = yield* chain;
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* assignedPieces).toEqual([alpha.id]);
				}),
			);
		}).pipe(Effect.provide(layer));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* db.PieceAgent.all()).length).toBe(2);
				}),
			);
			const agents = yield* db.Agent.all();
			expect(agents.filter((agent) => agent.status === "alive")).toHaveLength(
				1,
			);
		}).pipe(Effect.provide(layer));
	}),
);
