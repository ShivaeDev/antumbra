import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeTrpcBridgeHandler } from "#adapters/trpc-bridge.ts";
import {
	makeTrpcSubscriptionHandlers,
	type SubscriptionSender,
} from "#adapters/trpc-subscription-handlers.ts";
import {
	makeWindowRegistry,
	type WindowRegistry,
} from "#adapters/windows/registry.ts";
import {
	consolePlace,
	contents,
	eventFor,
	type FakeContents,
	ownWindow,
	transcriptPlace,
} from "#test/windows.ts";

interface FakeSubscriptionSender extends SubscriptionSender, FakeContents {
	readonly destroy: () => void;
	readonly navigate: () => void;
}

const subscriptionSender = (
	documentId: string,
	senderId: number,
): FakeSubscriptionSender => {
	const base = contents(documentId);
	let destroyed: (() => void) | undefined;
	let navigated: (() => void) | undefined;
	const sender: FakeSubscriptionSender = {
		...base,
		destroy: () => {
			sender.destroyed = true;
			destroyed?.();
		},
		id: senderId,
		navigate: () => navigated?.(),
		on: (_name, listener) => {
			navigated = listener;
		},
		once: (_name, listener) => {
			destroyed = listener;
		},
		send: () => undefined,
	};
	return sender;
};

const ownSender = (
	registry: WindowRegistry,
	sender: FakeSubscriptionSender,
	id: string,
): void => {
	registry.own({
		contents: sender,
		document: sender.document,
		handle: {
			close: () => undefined,
			focus: () => undefined,
			isMinimized: () => false,
			restore: () => undefined,
			show: () => undefined,
		},
		id,
		place: transcriptPlace(id),
	});
};

describe("privileged IPC authority", () => {
	it.effect("refuses invoke before decoding or executing foreign input", () =>
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
			let decoded = false;
			const hostile = new Proxy({}, { get: () => (decoded = true) });

			expect(
				yield* Effect.promise(() => handler(eventFor(foreign), hostile)),
			).toEqual({
				error: { code: "UNAUTHORIZED", message: "unauthorized bridge sender" },
				ok: false,
			});
			expect(decoded).toBe(false);
			expect(executed).toEqual([]);

			// why: the record that answered for a request is the window that asked,
			// so a request can never be attributed to a neighbouring window.
			yield* Effect.promise(() => handler(eventFor(child.contents), {}));
			expect(executed).toEqual(["child"]);
		}),
	);

	it("refuses foreign subscribe and unsubscribe before decode or lookup", () => {
		const registry = makeWindowRegistry();
		const owned = subscriptionSender("owned", 17);
		const foreign = subscriptionSender("foreign", 17);
		ownSender(registry, owned, "owned");
		let signal: AbortSignal | undefined;
		let starts = 0;
		const handlers = makeTrpcSubscriptionHandlers(
			registry,
			(_sender, _windowId, _request, current) => {
				starts += 1;
				signal = current;
				return Effect.runPromise(Effect.never);
			},
		);

		handlers.subscribe(eventFor(owned), {
			id: "voyage-feed",
			input: {},
			path: "voyageFeed",
		});
		expect(starts).toBe(1);
		expect(signal?.aborted).toBe(false);

		let decoded = false;
		const hostile = new Proxy({}, { get: () => (decoded = true) });
		handlers.subscribe(eventFor(foreign), hostile);
		handlers.unsubscribe(eventFor(foreign), { id: "voyage-feed" });
		expect(starts).toBe(1);
		expect(decoded).toBe(false);
		expect(signal?.aborted).toBe(false);

		handlers.unsubscribe(eventFor(owned), { id: "voyage-feed" });
		expect(signal?.aborted).toBe(true);
	});

	it("rejects a duplicate subscription id without replacing its live stream", () => {
		const registry = makeWindowRegistry();
		const owned = subscriptionSender("owned", 17);
		ownSender(registry, owned, "owned");
		const signals: AbortSignal[] = [];
		const handlers = makeTrpcSubscriptionHandlers(
			registry,
			(_sender, _windowId, _request, signal) => {
				signals.push(signal);
				return Effect.runPromise(Effect.never);
			},
		);
		const request = { id: "voyage-feed", input: {}, path: "voyageFeed" };

		handlers.subscribe(eventFor(owned), request);
		handlers.subscribe(eventFor(owned), request);
		expect(signals).toHaveLength(1);
		expect(signals[0]?.aborted).toBe(false);
		handlers.unsubscribe(eventFor(owned), { id: request.id });
		expect(signals[0]?.aborted).toBe(true);
		handlers.subscribe(eventFor(owned), request);
		expect(signals).toHaveLength(1);
	});

	it("isolates unsubscribe and clears every stream on navigation or destruction", () => {
		const registry = makeWindowRegistry();
		const navigated = subscriptionSender("navigated", 21);
		ownSender(registry, navigated, "navigated");
		const navigationSignals = new Map<string, AbortSignal>();
		const navigationHandlers = makeTrpcSubscriptionHandlers(
			registry,
			(_sender, _windowId, request, signal) => {
				navigationSignals.set(request.id, signal);
				return Effect.runPromise(Effect.never);
			},
		);
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

		const destroyed = subscriptionSender("destroyed", 22);
		ownSender(registry, destroyed, "destroyed");
		let destructionSignal: AbortSignal | undefined;
		const destructionHandlers = makeTrpcSubscriptionHandlers(
			registry,
			(_sender, _windowId, _request, signal) => {
				destructionSignal = signal;
				return Effect.runPromise(Effect.never);
			},
		);
		destructionHandlers.subscribe(eventFor(destroyed), {
			id: "fleet",
			input: {},
			path: "fleetFeed",
		});
		destroyed.destroy();
		expect(destructionSignal?.aborted).toBe(true);
	});
});
