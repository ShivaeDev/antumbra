import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeTrpcBridgeHandler } from "#adapters/trpc-bridge.ts";
import { makeTrpcSubscriptionHandlers } from "#adapters/trpc-subscription-handlers.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, contents, countingSender, eventFor, ownContents, ownWindow, transcriptPlace } from "#test/windows.ts";

describe("privileged IPC authority", () => {
	it.effect("attributes invokes to their owned window", () =>
		Effect.gen(function* () {
			const registry = makeWindowRegistry();
			ownWindow(registry, "console", consolePlace);
			const child = ownWindow(registry, "child", transcriptPlace("session-1"));
			const foreign = contents("foreign");
			const executed: Array<string> = [];
			const handler = makeTrpcBridgeHandler(registry, (windowId) => {
				executed.push(windowId);
				return Effect.runPromise(Effect.succeed({ data: "called", ok: true }));
			});
			expect(yield* Effect.promise(() => handler(eventFor(foreign), {}))).toEqual({
				error: { code: "UNAUTHORIZED", message: "unauthorized bridge sender" },
				ok: false,
			});
			expect(executed).toEqual([]);

			yield* Effect.promise(() => handler(eventFor(child.contents), {}));
			expect(executed).toEqual(["child"]);
		}),
	);

	it("keeps another document from changing an owned subscription", () => {
		const registry = makeWindowRegistry();
		const owned = countingSender("owned", 17);
		const foreign = countingSender("foreign", 17);
		ownContents(registry, owned, "owned");
		let signal: AbortSignal | undefined;
		let starts = 0;
		const handlers = makeTrpcSubscriptionHandlers(registry, (_sender, _windowId, _request, current) => {
			starts += 1;
			signal = current;
			return Effect.runPromise(Effect.never);
		});

		handlers.subscribe(eventFor(owned), {
			id: "voyage-feed",
			input: {},
			path: "voyageFeed",
		});
		expect(starts).toBe(1);
		expect(signal?.aborted).toBe(false);

		handlers.subscribe(eventFor(foreign), {
			id: "voyage-feed",
			input: {},
			path: "voyageFeed",
		});
		handlers.unsubscribe(eventFor(foreign), { id: "voyage-feed" });
		expect(starts).toBe(1);
		expect(signal?.aborted).toBe(false);

		handlers.unsubscribe(eventFor(owned), { id: "voyage-feed" });
		expect(signal?.aborted).toBe(true);
	});

	it("isolates unsubscribe and clears every stream on navigation or destruction", () => {
		const registry = makeWindowRegistry();
		const navigated = countingSender("navigated", 21);
		ownContents(registry, navigated, "navigated");
		const navigationSignals = new Map<string, AbortSignal>();
		const navigationHandlers = makeTrpcSubscriptionHandlers(registry, (_sender, _windowId, request, signal) => {
			navigationSignals.set(request.id, signal);
			return Effect.runPromise(Effect.never);
		});
		navigationHandlers.subscribe(eventFor(navigated), {
			id: "alpha",
			input: {},
			path: "voyageFeed",
		});
		navigationHandlers.subscribe(eventFor(navigated), {
			id: "bravo",
			input: {},
			path: "voyagesFeed",
		});
		navigationHandlers.unsubscribe(eventFor(navigated), { id: "alpha" });
		expect(navigationSignals.get("alpha")?.aborted).toBe(true);
		expect(navigationSignals.get("bravo")?.aborted).toBe(false);
		navigated.navigate();
		expect(navigationSignals.get("bravo")?.aborted).toBe(true);

		const destroyed = countingSender("destroyed", 22);
		ownContents(registry, destroyed, "destroyed");
		let destructionSignal: AbortSignal | undefined;
		const destructionHandlers = makeTrpcSubscriptionHandlers(registry, (_sender, _windowId, _request, signal) => {
			destructionSignal = signal;
			return Effect.runPromise(Effect.never);
		});
		destructionHandlers.subscribe(eventFor(destroyed), {
			id: "fleet",
			input: {},
			path: "fleetFeed",
		});
		destroyed.destroy();
		expect(destructionSignal?.aborted).toBe(true);
	});
});
