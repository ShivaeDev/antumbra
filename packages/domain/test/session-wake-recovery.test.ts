import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import {
	eventually,
	payload,
	reportsNativeRef,
} from "#test/session-recovery-fixture.ts";
import {
	confirmsWhen,
	NATIVE,
	onlyRecovery,
	sessionRow,
	sleepingRoot,
	wakeLayer,
} from "#test/session-wake-fixture.ts";

// why: a drain the previous process never finished leaves a row saying the
// Session is mid-siesta with nothing draining it, and every later wake reads
// that as a reason to wait. Boot settles it, and the proof it settled truthfully
// is that speaking to the Session then works end to end.
it.live("boot settles a drain whose process is gone, and a send wakes it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.AgentSession.where({ id: payload.sessionId }).update({
					executionStatus: "draining",
				}),
			);
		}).pipe(Effect.provide(temporary.layer));
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			expect((yield* sessionRow).executionStatus).toBe("idle");
			yield* sight.send(payload.sessionId, "carry on");
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* onlyRecovery).status).toBe("succeeded");
					expect((yield* sessionRow).executionStatus).toBe("active");
				}),
			);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				"carry on",
			]);
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
	}),
);

// why: a resume that opens and then says nothing about who it is was the
// production hang — the Intent sat in "running" with no reason and the
// half-built attachment answered "held" to every later send. The bound turns it
// into a reason a second send can push, and the registry lets go on the way out.
it.live(
	"a resume that never confirms its opening stops holding the Session",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const { recorded, scripted } = yield* sleepingRoot(temporary);
			const allowed = yield* Ref.make(false);
			const backend = confirmsWhen(scripted.backend, scripted, allowed);

			yield* Effect.gen(function* () {
				const fabric = yield* SessionFabric;
				const sight = yield* SightSource;
				yield* sight.send(payload.sessionId, "are you there");
				const parked = yield* eventually(
					Effect.gen(function* () {
						const row = yield* onlyRecovery;
						expect(row.status).toBe("waiting");
						return row;
					}),
				);
				expect(parked.detail).toContain("did not reach a live attachment");
				expect(yield* fabric.holds(payload.sessionId)).toBe(false);
				expect((yield* sessionRow).executionStatus).toBe("idle");

				yield* Ref.set(allowed, true);
				yield* sight.send(payload.sessionId, "still asking");
				yield* eventually(
					Effect.gen(function* () {
						const row = yield* onlyRecovery;
						expect(row.id).toBe(parked.id);
						expect(row.status).toBe("succeeded");
						expect((yield* sessionRow).executionStatus).toBe("active");
					}),
				);
				expect(yield* fabric.holds(payload.sessionId)).toBe(true);
			}).pipe(
				Effect.provide(wakeLayer(temporary, backend, recorded.runner, 250)),
			);
		}),
);

// why: agent/recover is requeued by reclaim, so an Intent the old process left
// running comes back carrying words that were never said. It must say them
// once, to the Session it now reaches, and not leave a second demand behind.
it.live("a wake requeued after a restart says its words once", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const allowed = yield* Ref.make(false);
		const silent = confirmsWhen(scripted.backend, scripted, allowed);

		const running = yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "come about");
			return yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("running");
					return row;
				}),
			);
		}).pipe(Effect.provide(wakeLayer(temporary, silent, recorded.runner)));

		yield* Ref.set(allowed, true);
		yield* Effect.gen(function* () {
			yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.id).toBe(running.id);
					expect(row.status).toBe("succeeded");
				}),
			);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				"come about",
			]);
		}).pipe(
			Effect.provide(
				wakeLayer(
					temporary,
					reportsNativeRef(scripted.backend, scripted, NATIVE),
					recorded.runner,
				),
			),
		);
	}),
);

// why: the chips read the Intent table, and nothing wrote to it when a wake
// moved — so a parked wake appeared only when some unrelated act happened to
// ring the feed. A refused recover writes no Agent, Session or Piece row, which
// makes it the cleanest proof that the ring came from the Intent alone.
it.live("an Intent moving is enough to ring the fleet feed", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			// why: the feed opens with the snapshot as it stands, so a second one
			// is the only evidence of a ring — and between the two the fleet is
			// touched by nothing but an Intent that never reaches a row.
			const rings = yield* Effect.forkChild(
				sight.fleetFeed.pipe(
					Stream.take(2),
					Stream.runCollect,
					Effect.timeoutOrElse({
						duration: 5000,
						orElse: () =>
							Effect.die("the fleet feed did not ring for an Intent"),
					}),
				),
			);
			const ghost = yield* kernel.submit(domain.recover, {
				sessionId: "session-ghost",
			});
			const row = yield* eventually(
				Effect.gen(function* () {
					const found = Option.getOrThrow(
						yield* Database.use((db) =>
							db.Intent.where({ id: ghost.id }).first(),
						),
					);
					expect(found.status).toBe("failed");
					return found;
				}),
			);
			expect(row.detail).toContain("no root Session session-ghost");
			expect(yield* Fiber.join(rings)).toHaveLength(2);
		}).pipe(
			Effect.provide(wakeLayer(temporary, scripted.backend, recorded.runner)),
		);
	}),
);
