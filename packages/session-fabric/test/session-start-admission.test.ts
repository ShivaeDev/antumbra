import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Ref } from "effect";
import { SessionAttachmentFailure } from "#errors.ts";
import { makeSessionFabric } from "#fabric.ts";
import {
	idleHandle,
	options,
	scriptedBackend,
	sink,
	textInput,
} from "#test/fabric-fixtures.ts";

it.live(
	"reopen releases a start already waiting on its closed generation",
	() =>
		Effect.scoped(
			Effect.gen(function* () {
				const fabric = yield* makeSessionFabric;
				const attempted = yield* Deferred.make<void>();
				const admitted = yield* Deferred.make<void>();
				yield* fabric.closeStarts;
				const waiting = yield* Deferred.succeed(attempted, undefined).pipe(
					Effect.andThen(
						fabric.withStartAdmission(() =>
							Deferred.succeed(admitted, undefined),
						),
					),
					Effect.forkChild,
				);
				yield* Deferred.await(attempted);
				// why: after the synchronized attempt, the closed admission Deferred is
				// the child fiber's only possible suspension point.
				yield* Effect.yieldNow;
				yield* Effect.yieldNow;
				expect(waiting.pollUnsafe()).toBeUndefined();
				expect(yield* Deferred.isDone(admitted)).toBe(false);

				yield* fabric.reopenStarts;
				yield* Fiber.join(waiting);
				expect(yield* Deferred.isDone(admitted)).toBe(true);
			}),
		),
);

it.live("stop interrupts admission, closes once, and leaves retry fresh", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const queueEntered = yield* Deferred.make<void>();
			const release = yield* Deferred.make<void>();
			const closes = yield* Ref.make(0);
			const opens = yield* Ref.make(0);
			const queued = yield* Ref.make(false);
			const handle = {
				...idleHandle,
				queue: () =>
					Deferred.succeed(queueEntered, undefined).pipe(
						Effect.andThen(Deferred.await(release)),
						Effect.andThen(Ref.set(queued, true)),
					),
			};
			const backend = scriptedBackend(() =>
				Effect.gen(function* () {
					yield* Ref.update(opens, (count) => count + 1);
					yield* Effect.addFinalizer(() =>
						Ref.update(closes, (count) => count + 1),
					);
					return handle;
				}),
			);
			const fabric = yield* makeSessionFabric;
			const starting = yield* fabric
				.withStartAdmission((permit) =>
					fabric.start(
						permit,
						"agent-fabric",
						backend,
						options,
						sink,
						(attachment) => attachment.handle.queue(textInput("recover")),
					),
				)
				.pipe(Effect.forkChild);
			yield* Deferred.await(queueEntered);
			yield* fabric.stop(options.sessionId);
			const failure = yield* Effect.flip(Fiber.join(starting));
			expect(failure).toBeInstanceOf(SessionAttachmentFailure);
			expect(yield* Ref.get(closes)).toBe(1);
			expect(yield* Ref.get(queued)).toBe(false);

			yield* Deferred.succeed(release, undefined);
			yield* fabric.withStartAdmission((permit) =>
				fabric.start(
					permit,
					"agent-fabric",
					backend,
					options,
					sink,
					(attachment) => attachment.handle.queue(textInput("retry")),
				),
			);
			expect(yield* Ref.get(opens)).toBe(2);
			expect(yield* Ref.get(queued)).toBe(true);
		}),
	),
);
