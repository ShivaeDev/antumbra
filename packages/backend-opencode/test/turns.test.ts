import { expect, it } from "@effect/vitest";
import { Effect, Exit, Fiber } from "effect";
import type { TurnRequests } from "#turn-requests.ts";
import { makeTurnDriver } from "#turns.ts";

const IDLE = { type: "session.idle" };

const recordingProvider = () => {
	const sent: string[] = [];
	const requests: TurnRequests = {
		abort: Effect.succeed(true),
		prompt: (text) =>
			Effect.sync(() => {
				sent.push(text);
			}),
	};
	return { requests, sent };
};

// why: opencode admits a prompt into the loop a working session is already
// running, so the turn boundary `queue` promises is this driver's to keep. A
// queued prompt has not been accepted until its words reach the provider, and
// that is what its caller is still waiting on.
it.effect("holds a queued prompt while the session works", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const provider = recordingProvider();
			const driver = yield* makeTurnDriver(provider.requests);
			yield* driver.queue("first");
			const held = yield* Effect.forkChild(driver.queue("held"));
			yield* Effect.yieldNow;
			expect(provider.sent).toEqual(["first"]);
			expect(held.pollUnsafe()).toBeUndefined();
			yield* driver.track(IDLE);
			yield* Fiber.join(held);
			expect(provider.sent).toEqual(["first", "held"]);
		}),
	),
);

it.effect(
	"sends one queued prompt per turn, in the order they were taken",
	() =>
		Effect.scoped(
			Effect.gen(function* () {
				const provider = recordingProvider();
				const driver = yield* makeTurnDriver(provider.requests);
				yield* driver.queue("first");
				const earlier = yield* Effect.forkChild(driver.queue("earlier"));
				yield* Effect.yieldNow;
				const later = yield* Effect.forkChild(driver.queue("later"));
				yield* Effect.yieldNow;
				yield* driver.track(IDLE);
				yield* Fiber.join(earlier);
				expect(provider.sent).toEqual(["first", "earlier"]);
				expect(later.pollUnsafe()).toBeUndefined();
				yield* driver.track(IDLE);
				yield* Fiber.join(later);
				expect(provider.sent).toEqual(["first", "earlier", "later"]);
			}),
		),
);

// why: steering is what a bare prompt already does, so it never waits for the
// boundary a queued prompt is holding for — it overtakes it by design.
it("sends a steered prompt into the turn a queued one is waiting behind", () =>
	Effect.runPromise(
		Effect.scoped(
			Effect.gen(function* () {
				const provider = recordingProvider();
				const driver = yield* makeTurnDriver(provider.requests);
				yield* driver.queue("first");
				const held = yield* Effect.forkChild(driver.queue("held"));
				yield* Effect.yieldNow;
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
			const held = yield* Effect.forkChild(driver.queue("held"));
			yield* Effect.yieldNow;
			yield* driver.close;
			expect(Exit.isFailure(yield* Fiber.await(held))).toBe(true);
			expect(provider.sent).toEqual(["first"]);
		}),
	),
);
