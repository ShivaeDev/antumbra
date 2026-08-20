import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makeTrpcSubscriptionHandlers } from "#adapters/trpc-subscription-handlers.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { countingSender, eventFor, ownContents } from "#test/windows.ts";

const request = (id: string) => ({ id, input: {}, path: "fleetFeed" });

const settled = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("trpc subscription listeners", () => {
	it.effect(
		"keeps one listener pair per sender across repeated subscribe cycles",
		() =>
			Effect.gen(function* () {
				const registry = makeWindowRegistry();
				const sender = countingSender("long-lived", 31);
				ownContents(registry, sender, "long-lived");
				const event = eventFor(sender);
				const handlers = makeTrpcSubscriptionHandlers(
					registry,
					(_sender, _windowId, _request, signal) =>
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
		const registry = makeWindowRegistry();
		const sender = countingSender("reloaded", 32);
		ownContents(registry, sender, "reloaded");
		const event = eventFor(sender);
		const signals = new Map<string, AbortSignal>();
		const handlers = makeTrpcSubscriptionHandlers(
			registry,
			(_sender, _windowId, current, signal) => {
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
			const registry = makeWindowRegistry();
			const sender = countingSender("doomed", 33);
			ownContents(registry, sender, "doomed");
			const event = eventFor(sender);
			const signals = new Map<string, AbortSignal>();
			const handlers = makeTrpcSubscriptionHandlers(
				registry,
				(_sender, _windowId, current, signal) => {
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
