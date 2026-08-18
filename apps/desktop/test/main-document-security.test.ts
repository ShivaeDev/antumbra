import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
	type DocumentContents,
	type DocumentFrame,
	makeMainDocumentAuthority,
} from "#adapters/main-document-authority.ts";
import {
	confineNavigation,
	type NavigationPolicyHost,
} from "#adapters/main-window.ts";
import { makeTrpcBridgeHandler } from "#adapters/trpc-bridge.ts";
import {
	makeTrpcSubscriptionHandlers,
	type SubscriptionSender,
} from "#adapters/trpc-subscription-handlers.ts";

interface FakeContents extends DocumentContents {
	destroyed: boolean;
	document: string;
}

const contents = (id: string): FakeContents => {
	const frame = { url: `file:///app/${id}.html` };
	return {
		destroyed: false,
		document: frame.url,
		getURL() {
			return this.document;
		},
		isDestroyed() {
			return this.destroyed;
		},
		mainFrame: frame,
	};
};

const eventFor = <Sender extends DocumentContents>(
	sender: Sender,
	senderFrame: DocumentFrame | null = sender.mainFrame,
) => ({ sender, senderFrame });

describe("main document authority", () => {
	it("accepts only the owned live main frame at its exact loaded document", () => {
		const authority = makeMainDocumentAuthority();
		const owned = contents("owned");
		const foreign = contents("foreign");
		expect(authority.authorizes(eventFor(owned))).toBe(false);
		authority.own(owned, owned.document);

		expect(authority.authorizes(eventFor(owned))).toBe(true);
		expect(authority.authorizes(eventFor(foreign))).toBe(false);
		expect(authority.authorizes(eventFor(owned, { url: owned.document }))).toBe(
			false,
		);
		expect(authority.authorizes(eventFor(owned, null))).toBe(false);

		owned.document = "https://escape.example/";
		expect(authority.authorizes(eventFor(owned))).toBe(false);
		owned.document = owned.mainFrame.url;
		owned.destroyed = true;
		expect(authority.authorizes(eventFor(owned))).toBe(false);
	});

	it("denies navigation, redirects, frame navigation, and new windows", () => {
		const listeners = new Map<
			string,
			(event: { preventDefault(): void }) => void
		>();
		let openWindow: (() => { readonly action: "deny" }) | undefined;
		const host: NavigationPolicyHost = {
			onFrameNavigation: (listener) =>
				listeners.set("will-frame-navigate", listener),
			onNavigation: (listener) => listeners.set("will-navigate", listener),
			onRedirect: (listener) => listeners.set("will-redirect", listener),
			setWindowOpenHandler: (handler) => {
				openWindow = handler;
			},
		};
		confineNavigation(host);

		for (const name of [
			"will-navigate",
			"will-frame-navigate",
			"will-redirect",
		]) {
			let denied = false;
			listeners.get(name)?.({ preventDefault: () => (denied = true) });
			expect(denied, name).toBe(true);
		}
		expect(openWindow?.()).toEqual({ action: "deny" });
	});
});

describe("privileged IPC authority", () => {
	it.effect("refuses invoke before decoding or executing foreign input", () =>
		Effect.gen(function* () {
			const authority = makeMainDocumentAuthority();
			const owned = bridgeContents("owned");
			const foreign = bridgeContents("foreign");
			authority.own(owned, owned.document);
			let executed = false;
			const handler = makeTrpcBridgeHandler(authority, () => {
				executed = true;
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
			expect(executed).toBe(false);
		}),
	);

	it("refuses foreign subscribe and unsubscribe before decode or lookup", () => {
		const authority = makeMainDocumentAuthority();
		const owned = subscriptionSender("owned", 17);
		const foreign = subscriptionSender("foreign", 17);
		authority.own(owned, owned.document);
		let signal: AbortSignal | undefined;
		let starts = 0;
		const handlers = makeTrpcSubscriptionHandlers(
			authority,
			(_sender, _request, current) => {
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
		const authority = makeMainDocumentAuthority();
		const owned = subscriptionSender("owned", 17);
		authority.own(owned, owned.document);
		const signals: AbortSignal[] = [];
		const handlers = makeTrpcSubscriptionHandlers(
			authority,
			(_sender, _request, signal) => {
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
		const authority = makeMainDocumentAuthority();
		const navigated = subscriptionSender("navigated", 21);
		authority.own(navigated, navigated.document);
		const navigationSignals = new Map<string, AbortSignal>();
		const navigationHandlers = makeTrpcSubscriptionHandlers(
			authority,
			(_sender, request, signal) => {
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
		authority.own(destroyed, destroyed.document);
		let destructionSignal: AbortSignal | undefined;
		const destructionHandlers = makeTrpcSubscriptionHandlers(
			authority,
			(_sender, _request, signal) => {
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

const bridgeContents = (
	id: string,
): FakeContents & { readonly id: number } => ({
	...contents(id),
	id: id.length,
});
