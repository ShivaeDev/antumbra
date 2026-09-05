import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Queue, RcRef } from "effect";
import type { LineProcess } from "#adapters/process.ts";
import { makeCodexServers } from "#server.ts";
import { type FakeAppServer, makeFakeAppServer } from "#test/fake.ts";

it.effect("an app-server that dies fails the request in flight and is replaced for the next holder", () =>
	Effect.gen(function* () {
		const spawned = yield* Queue.unbounded<FakeAppServer>();
		const spawn = (): LineProcess => {
			const fake = makeFakeAppServer({ hold: "thread/start" });
			Queue.offerUnsafe(spawned, fake);
			return fake.process;
		};
		const pool = yield* makeCodexServers({ skills: "/antumbra/skills", spawn });

		const failure = yield* Effect.scoped(
			Effect.gen(function* () {
				const server = yield* RcRef.get(pool);
				const live = yield* Queue.take(spawned);
				const opening = yield* Effect.forkChild(server.request("thread/start", { cwd: "/moorage" }));
				yield* live.takeHeldRequest;
				live.exit();
				return yield* Effect.flip(Fiber.join(opening));
			}),
		);

		expect(failure).toMatchObject({ detail: "app-server exited", tag: "codex" });
		yield* Effect.scoped(RcRef.get(pool));
		expect(yield* Queue.size(spawned)).toBe(1);
	}).pipe(Effect.scoped),
);
