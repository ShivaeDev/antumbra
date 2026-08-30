import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Ref } from "effect";
import { KernelReach, KernelReachDeferredLive, KernelReachInstaller } from "#kernel-reach.ts";
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
		const installer = yield* KernelReachInstaller;
		const received = yield* Ref.make<SpawnFields | undefined>(undefined);
		const completed = yield* Ref.make(false);
		const waiting = yield* reach.submitSpawn(spawn).pipe(
			Effect.tap(() => Ref.set(completed, true)),
			Effect.forkChild,
		);
		yield* Effect.yieldNow;
		expect(yield* Ref.get(completed)).toBe(false);

		yield* installer.install({
			...fakeKernelReach,
			submitSpawn: (payload) => Ref.set(received, payload).pipe(Effect.as("spawn-intent")),
		});

		expect(yield* Fiber.join(waiting)).toBe("spawn-intent");
		expect(yield* Ref.get(received)).toEqual(spawn);
	}).pipe(Effect.provide(KernelReachDeferredLive)),
);
