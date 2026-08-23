import { describe, expect, it } from "@effect/vitest";
import { getTRPCErrorFromUnknown } from "@trpc/server";
import { Effect, Stream } from "effect";
import {
	consoleWindow,
	fleet,
	info,
	makeRuntime,
	storedEvents,
} from "#fixtures.ts";
import { makeAppRouter, SETTINGS } from "#index.ts";

describe("makeAppRouter", () => {
	it.effect("serves app info from the runtime's source", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
			const served = yield* Effect.promise(() => caller.appInfo());
			expect(served).toEqual(info);
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("serves every declared setting and refuses an undeclared key", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
			const served = yield* Effect.promise(() => caller.settings());
			expect(served.settings).toEqual({
				maxParallelSessions: SETTINGS.maxParallelSessions.fallback,
				retireRestMinutes: SETTINGS.retireRestMinutes.fallback,
				retireSweep: SETTINGS.retireSweep.fallback,
			});
			const refused = yield* Effect.tryPromise(() =>
				// @ts-expect-error a key the catalog never declared is not a setting.
				caller.changeSetting({ key: "retireEverything", value: true }),
			).pipe(Effect.flip);
			expect(String(refused.cause)).toContain("retireEverything");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("serves the fleet and event log through sight", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
			const served = yield* Effect.promise(() => caller.fleet());
			expect(served).toEqual(fleet);
			const events = yield* Effect.promise(() =>
				caller.sessionEvents({ fromSeq: 1, sessionId: "session-1" }),
			);
			expect(events.map((event) => event.seq)).toEqual(
				storedEvents.slice(1).map((event) => event.seq),
			);
			expect(events.map((event) => event.event._tag)).toContain("Unknown");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("streams a subscription to completion", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
			const iterable = yield* Effect.promise(() =>
				caller.sessionEventFeed({ fromSeq: 0, sessionId: "session-1" }),
			);
			const collected = yield* Stream.fromAsyncIterable(
				iterable,
				(cause) => cause,
			).pipe(Stream.runCollect);
			expect(collected.map((event) => event.seq)).toEqual(
				storedEvents.map((event) => event.seq),
			);
			expect(collected.map((event) => event.event)).toEqual(
				storedEvents.map((event) => event.event),
			);
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("maps sight failures to trpc internal errors", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
			const outcome = yield* Effect.tryPromise(() =>
				caller.interruptSession({ sessionId: "ghost" }),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain("session not live: ghost");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("carries the admiral's words to a session through sight", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
			yield* Effect.promise(() =>
				caller.sendToSession({ sessionId: "session-1", text: "come about" }),
			);
			const refused = yield* Effect.tryPromise(() =>
				caller.sendToSession({ sessionId: "session-1", text: "" }),
			).pipe(Effect.flip);
			expect(String(refused.cause)).toContain("a message with no words");
			yield* Effect.promise(() => runtime.dispose());
		}),
	);

	it.effect("spawns through sight and returns the receipt", () =>
		Effect.gen(function* () {
			const runtime = makeRuntime();
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
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
			const caller = makeAppRouter(runtime).createCaller({
				windowId: "console",
			});
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

	// why: a window refused its request is refused, not broken — the renderer
	// has to be able to tell a forbidden ask from a source that fell over.
	it.effect(
		"serves a window its place and surfaces refusals as forbidden",
		() =>
			Effect.gen(function* () {
				const runtime = makeRuntime();
				const caller = makeAppRouter(runtime).createCaller({
					windowId: "console",
				});
				expect(yield* Effect.promise(() => caller.windowPlace())).toEqual(
					consoleWindow,
				);
				const refused = yield* Effect.tryPromise(() =>
					caller.openWindow(consoleWindow),
				).pipe(Effect.flip);
				const failure = getTRPCErrorFromUnknown(refused.cause);
				expect(failure.code).toBe("FORBIDDEN");
				expect(failure.message).toBe("console_is_not_a_target");
				yield* Effect.promise(() => runtime.dispose());
			}),
	);
});
