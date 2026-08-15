import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import {
	AppInfoSource,
	makeAppRouter,
	type SessionEvent,
	SightFailure,
	SightSource,
} from "#index.ts";

const info = {
	chromeVersion: "138.0.0.0",
	electronVersion: "43.3.0",
	nodeVersion: "22.21.0",
	productVersion: "0.0.0",
};

const fleet = {
	agents: [
		{
			berths: [{ branch: "work/agent-1/reef", slug: "reef", status: "ready" }],
			charter: "chart the reef",
			id: "agent-1",
			role: "navigator",
			sessions: [
				{
					backend: "claude",
					cwd: "/tmp/reef",
					id: "session-1",
					status: "open",
				},
			],
			status: "alive",
		},
	],
	backends: ["claude"],
};

const storedEvents: ReadonlyArray<SessionEvent> = [
	{ kind: "system/init", payload: "{}", seq: 0, sessionId: "session-1" },
	{ kind: "assistant", payload: "{}", seq: 1, sessionId: "session-1" },
];

const makeRuntime = () =>
	ManagedRuntime.make(
		Layer.mergeAll(
			Layer.succeed(AppInfoSource, { current: Effect.succeed(info) }),
			Layer.succeed(SightSource, {
				fleet: Effect.succeed(fleet),
				fleetFeed: Stream.make(fleet),
				interrupt: (sessionId) =>
					new SightFailure({ message: `session not live: ${sessionId}` }),
				retire: () => Effect.void,
				sessionEventFeed: (query) =>
					Stream.fromArray(
						storedEvents.filter((event) => event.seq >= query.fromSeq),
					),
				sessionEvents: (query) =>
					Effect.succeed(
						storedEvents.filter((event) => event.seq >= query.fromSeq),
					),
				spawn: (request) =>
					Effect.succeed({
						agentId: `agent-for-${request.role}`,
						sessionId: "session-new",
					}),
			}),
		),
	);

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
					repos: [{ ref: "main", source: "/tmp/shoals" }],
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
});
