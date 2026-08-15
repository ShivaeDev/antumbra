import { maxConcurrency } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import {
	acquireTemporaryPersistence,
	dispatchingLayer,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import {
	assignedPieces,
	chain,
	eventually,
	PATIENCE,
	stateOf,
} from "#test/voyage-fixtures.ts";

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

// why: the window between the agent row and its session is where a second
// dispatch would slip in, so the piece must read active from the first row
// written, not from the moment the session opens.
it.live("a piece stays active while its agent is still spawning", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const provisioning = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const runner: Runner = {
			...recorded.runner,
			provision: (request) =>
				Deferred.succeed(provisioning, undefined).pipe(
					Effect.andThen(Deferred.await(release)),
					Effect.andThen(recorded.runner.provision(request)),
				),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const { alpha, voyage } = yield* chain;
			yield* Deferred.await(provisioning);

			const agents = yield* db.Agent.all();
			expect(agents.map((agent) => agent.status)).toEqual(["spawning"]);
			expect(yield* assignedPieces).toEqual([alpha.id]);
			expect(yield* stateOf(voyage.id, alpha.id)).toBe("active");

			yield* Effect.sleep(200);
			expect(yield* assignedPieces).toEqual([alpha.id]);

			yield* Deferred.succeed(release, undefined);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* stateOf(voyage.id, alpha.id)).toBe("active");
					expect(yield* db.Agent.where({ status: "alive" }).all()).toHaveLength(
						1,
					);
				}),
			);
		}).pipe(
			Effect.provide(
				dispatchingLayer(temporary, scripted.backend, PATIENCE, {}, runner),
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
					const agents = yield* db.Agent.all();
					expect(agents.map((agent) => agent.status).sort()).toEqual([
						"alive",
						"dormant",
					]);
				}),
			);
		}).pipe(Effect.provide(layer));
	}),
);
