import { SessionReach } from "@antumbra/sessions";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Ref } from "effect";
import { KernelReach } from "#kernel-reach/service.ts";
import { sessionReachLayer } from "#kernel-reach/session.ts";
import type { SpawnFields } from "#spawn.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";

const spawn: SpawnFields = {
	agentId: "agent-late",
	backend: "scripted",
	charter: "wait for the kernel",
	role: "hand",
	runner: "local",
	sessionId: "session-late",
};

it.live("kernel reach waits for the one installed scheduler path", () =>
	Effect.gen(function* () {
		const reach = yield* KernelReach;
		const sessions = yield* SessionReach;
		const settled = yield* Ref.make<string | undefined>(undefined);
		const settling = yield* sessions.settleWakes("session-late").pipe(Effect.forkChild);
		const received = yield* Ref.make<SpawnFields | undefined>(undefined);
		const completed = yield* Ref.make(false);
		const waiting = yield* reach.submitSpawn(spawn).pipe(
			Effect.tap(() => Ref.set(completed, true)),
			Effect.forkChild,
		);
		yield* Effect.yieldNow;
		expect(yield* Ref.get(completed)).toBe(false);
		expect(yield* Ref.get(settled)).toBeUndefined();

		yield* reach.install({
			...fakeKernelReach,
			settleWakes: (id) => Ref.set(settled, id),
			submitSpawn: (payload) => Ref.set(received, payload).pipe(Effect.as("spawn-intent")),
		});

		expect(yield* Fiber.join(waiting)).toBe("spawn-intent");
		expect(yield* Ref.get(received)).toEqual(spawn);
		yield* Fiber.join(settling);
		expect(yield* Ref.get(settled)).toBe("session-late");
	}).pipe(Effect.provide(sessionReachLayer)),
);
