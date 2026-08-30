import { expect, it } from "@effect/vitest";
import { Effect, Exit, Fiber } from "effect";
import { opencodeFailure } from "#failure.ts";
import type { TurnRequests } from "#turn-requests.ts";
import { makeTurnDriver } from "#turns.ts";

const IDLE = { type: "session.idle" };

const recordingProvider = (failOn?: string) => {
	const sent: string[] = [];
	const requests: TurnRequests = {
		abort: Effect.succeed(true),
		prompt: (text) =>
			text === failOn
				? Effect.fail(opencodeFailure(`failed ${text}`))
				: Effect.sync(() => {
						sent.push(text);
					}),
	};
	return { requests, sent };
};

it.effect("holds a queued prompt while the session works", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const provider = recordingProvider();
			const driver = yield* makeTurnDriver(provider.requests);
			yield* driver.queue("first");
			const held = yield* Effect.forkChild(driver.queue("held"), { startImmediately: true });
			expect(provider.sent).toEqual(["first"]);
			yield* driver.track(IDLE);
			yield* Fiber.join(held);
			expect(provider.sent).toEqual(["first", "held"]);
		}),
	),
);

it.effect("sends one queued prompt per turn, in the order they were taken", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const provider = recordingProvider();
			const driver = yield* makeTurnDriver(provider.requests);
			yield* driver.queue("first");
			const earlier = yield* Effect.forkChild(driver.queue("earlier"), { startImmediately: true });
			const later = yield* Effect.forkChild(driver.queue("later"), { startImmediately: true });
			yield* driver.track(IDLE);
			yield* Fiber.join(earlier);
			expect(provider.sent).toEqual(["first", "earlier"]);
			yield* driver.track(IDLE);
			yield* Fiber.join(later);
			expect(provider.sent).toEqual(["first", "earlier", "later"]);
		}),
	),
);

it("sends a steered prompt into the turn a queued one is waiting behind", () =>
	Effect.runPromise(
		Effect.scoped(
			Effect.gen(function* () {
				const provider = recordingProvider();
				const driver = yield* makeTurnDriver(provider.requests);
				yield* driver.queue("first");
				const held = yield* Effect.forkChild(driver.queue("held"), { startImmediately: true });
				yield* driver.steer("steered");
				expect(provider.sent).toEqual(["first", "steered"]);
				yield* driver.track(IDLE);
				yield* Fiber.join(held);
				expect(provider.sent).toEqual(["first", "steered", "held"]);
			}),
		),
	));

it.effect("fails every prompt still waiting when the session closes", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const provider = recordingProvider();
			const driver = yield* makeTurnDriver(provider.requests);
			yield* driver.queue("first");
			const held = yield* Effect.forkChild(driver.queue("held"), { startImmediately: true });
			yield* driver.close;
			expect(Exit.isFailure(yield* Fiber.await(held))).toBe(true);
			expect(provider.sent).toEqual(["first"]);
		}),
	),
);

it.effect("removes a queued prompt when the provider refuses it", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const provider = recordingProvider("broken");
			const driver = yield* makeTurnDriver(provider.requests);
			yield* driver.queue("first");
			const broken = yield* Effect.forkChild(driver.queue("broken"), { startImmediately: true });
			yield* driver.track(IDLE);
			expect(Exit.isFailure(yield* Fiber.await(broken))).toBe(true);
			yield* driver.queue("later");
			expect(provider.sent).toEqual(["first", "later"]);
		}),
	),
);
