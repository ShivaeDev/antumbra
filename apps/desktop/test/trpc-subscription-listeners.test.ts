import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeMainDocumentAuthority } from "#adapters/main-document-authority.ts";
import {
	makeTrpcSubscriptionHandlers,
	type SubscriptionSender,
} from "#adapters/trpc-subscription-handlers.ts";

interface Registration {
	readonly listener: () => void;
	readonly once: boolean;
}

interface CountingSender extends SubscriptionSender {
	readonly destroy: () => void;
	readonly document: string;
	readonly listeners: (name: string) => number;
	readonly navigate: () => void;
}

// why: the real sender is an EventEmitter that keeps every listener handed to
// it and warns past ten. A double that holds only the newest one per name can
// never show a pile-up, which is how listeners accrued here unnoticed.
const countingSender = (senderId: number): CountingSender => {
	const url = `file:///app/window-${senderId}.html`;
	const registered = new Map<string, ReadonlyArray<Registration>>();
	const add = (name: string, listener: () => void, once: boolean) => {
		registered.set(name, [...(registered.get(name) ?? []), { listener, once }]);
	};
	const fire = (name: string) => {
		const entries = registered.get(name) ?? [];
		registered.set(
			name,
			entries.filter((entry) => !entry.once),
		);
		for (const entry of entries) {
			entry.listener();
		}
	};
	let destroyed = false;
	return {
		destroy: () => {
			destroyed = true;
			fire("destroyed");
		},
		document: url,
		getURL: () => url,
		id: senderId,
		isDestroyed: () => destroyed,
		listeners: (name) => (registered.get(name) ?? []).length,
		mainFrame: { url },
		navigate: () => fire("did-start-navigation"),
		on: (name, listener) => add(name, listener, false),
		once: (name, listener) => add(name, listener, true),
		send: () => undefined,
	};
};

const request = (id: string) => ({ id, input: {}, path: "fleetFeed" });

const settled = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("trpc subscription listeners", () => {
	it.effect(
		"keeps one listener pair per sender across repeated subscribe cycles",
		() =>
			Effect.gen(function* () {
				const authority = makeMainDocumentAuthority();
				const sender = countingSender(31);
				authority.own(sender, sender.document);
				const event = { sender, senderFrame: sender.mainFrame };
				const handlers = makeTrpcSubscriptionHandlers(
					authority,
					(_sender, _request, signal) =>
						new Promise<void>((resolve) => {
							signal.addEventListener("abort", () => resolve());
						}),
				);

				// why: past ten listeners on one emitter Node calls it a leak, so the
				// count has to hold at the baseline well beyond that.
				for (let round = 0; round < 12; round += 1) {
					handlers.subscribe(event, request("fleet"));
					handlers.unsubscribe(event, { id: "fleet" });
					yield* Effect.promise(settled);
				}

				expect(sender.listeners("did-start-navigation")).toBe(1);
				expect(sender.listeners("destroyed")).toBe(1);
			}),
	);

	it("re-subscribes after a navigation without attaching a second pair", () => {
		const authority = makeMainDocumentAuthority();
		const sender = countingSender(32);
		authority.own(sender, sender.document);
		const event = { sender, senderFrame: sender.mainFrame };
		const signals = new Map<string, AbortSignal>();
		const handlers = makeTrpcSubscriptionHandlers(
			authority,
			(_sender, current, signal) => {
				signals.set(current.id, signal);
				return new Promise<void>(() => undefined);
			},
		);

		handlers.subscribe(event, request("alpha"));
		sender.navigate();
		expect(signals.get("alpha")?.aborted).toBe(true);

		handlers.subscribe(event, request("bravo"));
		expect(signals.get("bravo")?.aborted).toBe(false);
		expect(sender.listeners("did-start-navigation")).toBe(1);
		expect(sender.listeners("destroyed")).toBe(1);
	});

	it.effect("aborts every live subscription when the sender is destroyed", () =>
		Effect.gen(function* () {
			const authority = makeMainDocumentAuthority();
			const sender = countingSender(33);
			authority.own(sender, sender.document);
			const event = { sender, senderFrame: sender.mainFrame };
			const signals = new Map<string, AbortSignal>();
			const handlers = makeTrpcSubscriptionHandlers(
				authority,
				(_sender, current, signal) => {
					signals.set(current.id, signal);
					return new Promise<void>((resolve) => {
						signal.addEventListener("abort", () => resolve());
					});
				},
			);

			handlers.subscribe(event, request("alpha"));
			handlers.subscribe(event, request("bravo"));
			sender.destroy();
			yield* Effect.promise(settled);

			expect(signals.get("alpha")?.aborted).toBe(true);
			expect(signals.get("bravo")?.aborted).toBe(true);
		}),
	);
});
