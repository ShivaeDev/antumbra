import { maxConcurrency } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option } from "effect";
import { dispatchingLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
	makeScriptedRunner,
	rawOf,
	sessionFor,
} from "#test/harness.ts";
import {
	reportsNativeRef,
	WAKE_INSTRUCTION,
} from "#test/session-recovery-fixture.ts";
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
			provision: (plan) =>
				Deferred.succeed(provisioning, undefined).pipe(
					Effect.andThen(Deferred.await(release)),
					Effect.andThen(recorded.runner.provision(plan)),
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

it.live("a piece whose Agent survived a crash is not dispatched twice", () =>
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
					expect((yield* db.PieceAgent.all()).length).toBe(1);
					const agents = yield* db.Agent.all();
					expect(agents.map((agent) => agent.status)).toEqual(["alive"]);
				}),
			);
		}).pipe(Effect.provide(layer));
	}),
);

it.live(
	"assigned work wakes the same idle Agent where it stands, before spawn",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const backend = reportsNativeRef(
				scripted.backend,
				scripted,
				"native-assigned",
			);
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const { alpha } = yield* chain;
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* assignedPieces).toEqual([alpha.id]);
					}),
				);
				const assignment = (yield* db.PieceAgent.where({
					pieceId: alpha.id,
				}).all())[0];
				expect(assignment).toBeDefined();
				if (assignment === undefined) {
					return yield* Effect.die("the dispatched Piece has no Agent");
				}
				const initial = yield* sessionFor(scripted, assignment.agentId);
				yield* initial.emit({
					nativeRef: "native-assigned",
					raw: rawOf("session/opened"),
					type: "session.opened",
				});
				const session = (yield* db.AgentSession.where({
					agentId: assignment.agentId,
				}).all())[0];
				expect(session).toBeDefined();
				if (session === undefined) {
					return yield* Effect.die("the assigned Agent has no Session");
				}
				yield* eventually(
					Effect.gen(function* () {
						const stored = yield* db.AgentSession.where({
							id: session.id,
						}).first();
						expect(Option.getOrThrow(stored).nativeRef).toBe("native-assigned");
					}),
				);

				yield* callTool(initial, "stand_down", undefined);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* initial.sent).toContain(WAKE_INSTRUCTION);
					}),
				);
				// why: the Agent stood down but never left, so the work it was
				// already holding reaches it where it stands — one provider
				// session for the whole assignment, and no second conversation
				// opened over the first.
				expect(yield* scripted.opened).toHaveLength(1);
				expect(yield* initial.closed).toBe(false);
				expect(yield* db.Agent.all()).toHaveLength(1);
				expect(yield* db.AgentSession.all()).toHaveLength(1);
				expect(yield* db.PieceAgent.all()).toEqual([assignment]);
				expect(
					yield* db.Intent.where({ tag: "agent/spawn" }).all(),
				).toHaveLength(1);
				expect(
					Option.getOrThrow(
						yield* db.AgentSession.where({ id: session.id }).first(),
					).executionStatus,
				).toBe("active");
			}).pipe(
				Effect.provide(
					dispatchingLayer(temporary, backend, {
						maxAlive: 1,
						patienceMillis: 50,
					}),
				),
			);
		}),
);
