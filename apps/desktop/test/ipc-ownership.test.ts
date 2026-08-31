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
			const foreign = contents();
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
		const owned = countingSender(17);
		const foreign = countingSender(17);
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

	it("isolates unsubscribe by id", () => {
		const registry = makeWindowRegistry();
		const sender = countingSender(21);
		ownContents(registry, sender, "owned");
		const signals = new Map<string, AbortSignal>();
		const handlers = makeTrpcSubscriptionHandlers(registry, (_sender, _windowId, request, signal) => {
			signals.set(request.id, signal);
			return Effect.runPromise(Effect.never);
		});
		handlers.subscribe(eventFor(sender), {
			id: "alpha",
			input: {},
			path: "voyageFeed",
		});
		handlers.subscribe(eventFor(sender), {
			id: "bravo",
			input: {},
			path: "voyagesFeed",
		});
		handlers.unsubscribe(eventFor(sender), { id: "alpha" });
		expect(signals.get("alpha")?.aborted).toBe(true);
		expect(signals.get("bravo")?.aborted).toBe(false);
	});
});
