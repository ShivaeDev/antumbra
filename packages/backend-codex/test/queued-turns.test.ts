import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Queue, Ref, Semaphore } from "effect";
import { makeQueuedTurns } from "#queued-turns.ts";
import { textInput } from "#test/input.ts";
import type { TurnRequests } from "#turn-requests.ts";
import { idle, type TurnState, withoutTurn, withTurn } from "#turn-state.ts";

interface StartRequest {
	readonly accept: (turnId: string) => Effect.Effect<boolean>;
	readonly input: SessionInput;
}

const unused = (): Effect.Effect<never, BackendFailure> => Effect.die("unexpected request");

it.effect("queued inputs reach provider turns in order", () =>
	Effect.gen(function* () {
		const state = yield* Ref.make<TurnState>(withTurn(idle, "turn-1"));
		const gate = yield* Semaphore.make(1);
		const enqueued = yield* Queue.unbounded<void>();
		const starts = yield* Queue.unbounded<StartRequest>();
		const requests: TurnRequests = {
			interrupt: unused,
			start: (input) =>
				Effect.gen(function* () {
					const accepted = yield* Deferred.make<string>();
					yield* Queue.offer(starts, { accept: (turnId) => Deferred.succeed(accepted, turnId), input });
					return yield* Deferred.await(accepted);
				}),
			steer: unused,
		};
		const withPermit: Parameters<typeof makeQueuedTurns>[1] = (effect) =>
			gate.withPermit(effect).pipe(Effect.tap(() => Queue.offer(enqueued, undefined)));
		const queued = makeQueuedTurns(state, withPermit, requests, Effect.never);
		const completeTurn = Ref.update(state, (current) => (current._tag === "open" ? withoutTurn(current) : current)).pipe(
			Effect.andThen(queued.flush),
		);

		const second = yield* Effect.forkChild(queued.queue(textInput("second")));
		yield* Queue.take(enqueued);
		const third = yield* Effect.forkChild(queued.queue(textInput("third")));
		yield* Queue.take(enqueued);

		const flushSecond = yield* Effect.forkChild(completeTurn);
		const secondStart = yield* Queue.take(starts);
		expect(secondStart.input).toEqual(textInput("second"));
		yield* secondStart.accept("turn-2");
		yield* Fiber.join(flushSecond);
		yield* Fiber.join(second);

		const flushThird = yield* Effect.forkChild(completeTurn);
		const thirdStart = yield* Queue.take(starts);
		expect(thirdStart.input).toEqual(textInput("third"));
		yield* thirdStart.accept("turn-3");
		yield* Fiber.join(flushThird);
		yield* Fiber.join(third);
	}),
);
