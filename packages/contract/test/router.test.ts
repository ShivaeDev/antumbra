import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { makeAppRouter } from "#index.ts";
import { fleet, info, makeRuntime } from "#test/stub-sources.ts";

describe("makeAppRouter", () => {
	it.effect("serves app info from the runtime's source", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({ senderId: 7 });
			const served = yield* Effect.promise(() => caller.appInfo());
			expect(served).toEqual(info);
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("serves the fleet and event log through sight", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({ senderId: 7 });
			const served = yield* Effect.promise(() => caller.fleet());
			expect(served).toEqual(fleet);
			const events = yield* Effect.promise(() =>
				caller.sessionEvents({ fromSeq: 1, sessionId: "session-1" }),
			);
			expect(events.map((event) => event.seq)).toEqual([1]);
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("streams a subscription to completion", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({ senderId: 7 });
			const iterable = yield* Effect.promise(() =>
				caller.sessionEventFeed({ fromSeq: 0, sessionId: "session-1" }),
			);
			const collected = yield* Stream.fromAsyncIterable(
				iterable,
				(cause) => cause,
			).pipe(Stream.runCollect);
			expect(collected.map((event) => event.seq)).toEqual([0, 1]);
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("maps sight failures to trpc internal errors", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({ senderId: 7 });
			const outcome = yield* Effect.tryPromise(() =>
				caller.interruptSession({ sessionId: "ghost" }),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain("session not live: ghost");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("spawns through sight and returns the receipt", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({ senderId: 7 });
			const receipt = yield* Effect.promise(() =>
				caller.spawnAgent({
					backend: "claude",
					charter: "map the shoals",
					role: "surveyor",
				}),
			);
			expect(receipt).toEqual({
				agentId: "agent-for-surveyor",
				sessionId: "session-new",
			});
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("registers a repo through sight and returns its summary", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({ senderId: 7 });
			const registered = yield* Effect.promise(() =>
				caller.registerRepo({ defaultRef: "trunk", source: "/tmp/shallows" }),
			);
			expect(registered).toEqual({
				defaultRef: "trunk",
				id: "repo-new",
				name: "shallows",
				source: "/tmp/shallows",
			});
			yield* Effect.promise(() => runtime.dispose());
		}),
	);
});
