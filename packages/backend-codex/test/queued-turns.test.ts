import type { BackendFailure } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Ref, Semaphore } from "effect";
import { makeQueuedTurns } from "#queued-turns.ts";
import { textInput } from "#test/input.ts";
import type { TurnRequests } from "#turn-requests.ts";
import { idle, SESSION_CLOSED, type TurnState } from "#turn-state.ts";

const unused = (): Effect.Effect<never, BackendFailure> =>
	Effect.die("unexpected request");

it.effect("close fails a send whose turn/start has not been accepted", () =>
	Effect.gen(function* () {
		const state = yield* Ref.make<TurnState>(idle);
		const gate = yield* Semaphore.make(1);
		const closure = yield* Deferred.make<never, BackendFailure>();
		const started = yield* Deferred.make<void>();
		const requests: TurnRequests = {
			interrupt: unused,
			start: () =>
				Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
			steer: unused,
		};
		const queued = makeQueuedTurns(
			state,
			gate.withPermit,
			requests,
			Deferred.await(closure),
		);
		const delivery = yield* Effect.forkChild(queued.queue(textInput("held")));
		yield* Deferred.await(started);
		yield* Deferred.fail(closure, SESSION_CLOSED);
		yield* queued.close;
		expect(Exit.isFailure(yield* Fiber.await(delivery))).toBe(true);
	}),
);
