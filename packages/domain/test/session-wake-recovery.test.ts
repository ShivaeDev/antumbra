import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import { payload, reportsNativeRef, untilTerminal, untilWaitingOrTerminal } from "#test/session-recovery-fixture.ts";
import { confirmsWhen, NATIVE, onlyWake, sessionRow, sleepingRoot, wakeLayer } from "#test/session-wake-fixture.ts";

it.live("boot settles a drain whose process is gone, and a send wakes it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.AgentSession.where({ id: payload.sessionId }).update({
				executionStatus: "draining",
			});
		}).pipe(Effect.provide(temporary.layer));
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const kernel = yield* Kernel;
			expect((yield* sessionRow).executionStatus).toBe("idle");
			yield* sight.send(payload.sessionId, "carry on");
			expect(yield* untilWaitingOrTerminal(kernel.changes((yield* onlyWake).id))).toBe("succeeded");
			expect((yield* sessionRow).executionStatus).toBe("active");
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual(["carry on"]);
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
	}),
);

it.live("a resume that never confirms its opening stops holding the Session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const allowed = yield* Ref.make(false);
		const backend = confirmsWhen(scripted.backend, scripted, allowed);

		yield* Effect.gen(function* () {
			const fabric = yield* SessionFabric;
			const sight = yield* SightSource;
			const kernel = yield* Kernel;
			yield* sight.send(payload.sessionId, "are you there");
			expect(yield* untilWaitingOrTerminal(kernel.changes((yield* onlyWake).id))).toBe("waiting");
			const parked = yield* onlyWake;
			expect(parked.detail).toContain("did not reach a live attachment");
			expect(yield* fabric.holds(payload.sessionId)).toBe(false);
			expect((yield* sessionRow).executionStatus).toBe("idle");

			yield* Ref.set(allowed, true);
			yield* sight.send(payload.sessionId, "are you there");
			expect((yield* onlyWake).id).toBe(parked.id);
			expect(yield* untilWaitingOrTerminal(kernel.changes(parked.id))).toBe("succeeded");
			expect((yield* sessionRow).executionStatus).toBe("active");
			expect(yield* fabric.holds(payload.sessionId)).toBe(true);
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner, 250)));
	}),
);

it.live("a wake requeued after a restart says its words once", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const allowed = yield* Ref.make(false);
		const silent = confirmsWhen(scripted.backend, scripted, allowed);

		const running = yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const kernel = yield* Kernel;
			yield* sight.send(payload.sessionId, "come about");
			const row = yield* onlyWake;
			expect(
				yield* kernel.changes(row.id).pipe(
					Stream.filter((status) => status !== "queued"),
					Stream.runHead,
				),
			).toEqual(Option.some("running"));
			return row;
		}).pipe(Effect.provide(wakeLayer(temporary, silent, recorded.runner)));

		yield* Ref.set(allowed, true);
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			expect((yield* onlyWake).id).toBe(running.id);
			expect(yield* untilWaitingOrTerminal(kernel.changes(running.id))).toBe("succeeded");
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual(["come about"]);
		}).pipe(Effect.provide(wakeLayer(temporary, reportsNativeRef(scripted.backend, scripted, NATIVE), recorded.runner)));
	}),
);

it.live("an Intent moving is enough to ring the fleet feed", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			const initialFleet = yield* Deferred.make<void>();
			const rings = yield* Effect.forkChild(
				sight.fleetFeed.pipe(
					Stream.tap(() => Deferred.succeed(initialFleet, undefined)),
					Stream.take(2),
					Stream.runCollect,
					Effect.timeoutOrElse({
						duration: 5000,
						orElse: () => Effect.die("the fleet feed did not ring for an Intent"),
					}),
				),
			);
			yield* Deferred.await(initialFleet);
			const ghost = yield* kernel.submit(domain.wake, {
				sessionId: "session-ghost",
			});
			expect(yield* untilTerminal(ghost.changes)).toBe("failed");
			const row = Option.getOrThrow(yield* Database.use((db) => db.Intent.where({ id: ghost.id }).first()));
			expect(row.detail).toContain("no root Session session-ghost");
			expect(yield* Fiber.join(rings)).toHaveLength(2);
		}).pipe(Effect.provide(wakeLayer(temporary, scripted.backend, recorded.runner)));
	}),
);
