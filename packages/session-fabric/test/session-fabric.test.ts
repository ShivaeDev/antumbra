import type {
	AgentBackend,
	OpenSessionOptions,
	SessionHandle,
} from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option, Ref, Stream } from "effect";
import { SessionAttachmentFailure } from "#errors.ts";
import { makeSessionFabric } from "#fabric.ts";

const options: OpenSessionOptions = {
	cwd: "/tmp/session-fabric",
	resume: Option.some("native-fabric"),
	sessionId: "session-fabric",
	tools: [],
};

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

it.live("concurrent starts attach one backend handle per session", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const firstEntered = yield* Deferred.make<void>();
			const release = yield* Deferred.make<void>();
			const opens = yield* Ref.make(0);
			const handle: SessionHandle = {
				events: Stream.empty,
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.some("native-fabric")),
				queue: () => Effect.void,
				steer: () => Effect.void,
			};
			const backend: AgentBackend = {
				capabilities: {
					fork: false,
					liveInterrupt: true,
					multiClient: false,
				},
				openSession: () =>
					Effect.gen(function* () {
						yield* Ref.update(opens, (count) => count + 1);
						yield* Deferred.succeed(firstEntered, undefined);
						yield* Deferred.await(release);
						return handle;
					}),
				tag: "scripted",
			};
			const fabric = yield* makeSessionFabric;
			const first = yield* fabric
				.withStartAdmission((permit) =>
					fabric.start(
						permit,
						"agent-fabric",
						backend,
						options,
						() => Effect.succeed(true),
						() => Effect.void,
					),
				)
				.pipe(Effect.forkChild);
			yield* Deferred.await(firstEntered);
			const second = yield* fabric
				.withStartAdmission((permit) =>
					fabric.start(
						permit,
						"agent-fabric",
						backend,
						options,
						() => Effect.succeed(true),
						() => Effect.void,
					),
				)
				.pipe(Effect.forkChild);
			// why: reaching either suspension point proves both starts overlapped.
			yield* Effect.yieldNow;
			yield* Effect.yieldNow;
			yield* Deferred.succeed(release, undefined);
			yield* Fiber.join(first);
			yield* Fiber.join(second);
			expect(yield* Ref.get(opens)).toBe(1);
		}),
	),
);

it.live("one Agent cannot attach two different Sessions", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const entered = yield* Deferred.make<void>();
			const release = yield* Deferred.make<void>();
			const opens = yield* Ref.make(0);
			const handle: SessionHandle = {
				events: Stream.empty,
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.some("native-fabric")),
				queue: () => Effect.void,
				steer: () => Effect.void,
			};
			const backend: AgentBackend = {
				capabilities: {
					fork: false,
					liveInterrupt: true,
					multiClient: false,
				},
				openSession: () =>
					Ref.update(opens, (count) => count + 1).pipe(
						Effect.andThen(Deferred.succeed(entered, undefined)),
						Effect.andThen(Deferred.await(release)),
						Effect.as(handle),
					),
				tag: "scripted",
			};
			const fabric = yield* makeSessionFabric;
			const first = yield* fabric
				.withStartAdmission((permit) =>
					fabric.start(
						permit,
						"agent-fabric",
						backend,
						options,
						() => Effect.succeed(true),
						() => Effect.void,
					),
				)
				.pipe(Effect.forkChild);
			yield* Deferred.await(entered);
			const second = yield* fabric
				.withStartAdmission((permit) =>
					fabric.start(
						permit,
						"agent-fabric",
						backend,
						{ ...options, sessionId: "session-other" },
						() => Effect.succeed(true),
						() => Effect.void,
					),
				)
				.pipe(Effect.forkChild);
			yield* Effect.yieldNow;
			yield* Deferred.succeed(release, undefined);
			yield* Fiber.join(first);
			const failure = yield* Effect.flip(Fiber.join(second));
			expect(failure).toBeInstanceOf(SessionAttachmentFailure);
			expect(yield* Ref.get(opens)).toBe(1);
		}),
	),
);

it.live(
	"native identity is not confirmed when its event was not persisted",
	() =>
		Effect.scoped(
			Effect.gen(function* () {
				const handle: SessionHandle = {
					events: Stream.make({
						nativeRef: "native-fabric",
						raw: { kind: "session/opened", payload: "{}", source: "scripted" },
						type: "session.opened",
					}),
					interrupt: Effect.void,
					nativeRef: Effect.succeed(Option.some("native-fabric")),
					queue: () => Effect.void,
					steer: () => Effect.void,
				};
				const backend: AgentBackend = {
					capabilities: {
						fork: false,
						liveInterrupt: true,
						multiClient: false,
					},
					openSession: () => Effect.succeed(handle),
					tag: "scripted",
				};
				const fabric = yield* makeSessionFabric;
				const failure = yield* Effect.flip(
					fabric.withStartAdmission((permit) =>
						fabric.start(
							permit,
							"agent-fabric",
							backend,
							options,
							() => Effect.succeed(false),
							(attachment) => attachment.openedNativeRef.pipe(Effect.asVoid),
						),
					),
				);
				expect(failure).toBeInstanceOf(SessionAttachmentFailure);
				expect(failure.detail).toContain("durably record native identity");
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
			const handle: SessionHandle = {
				events: Stream.empty,
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.some("native-fabric")),
				queue: () =>
					Deferred.succeed(queueEntered, undefined).pipe(
						Effect.andThen(Deferred.await(release)),
						Effect.andThen(Ref.set(queued, true)),
					),
				steer: () => Effect.void,
			};
			const backend: AgentBackend = {
				capabilities: {
					fork: false,
					liveInterrupt: true,
					multiClient: false,
				},
				openSession: () =>
					Effect.gen(function* () {
						yield* Ref.update(opens, (count) => count + 1);
						yield* Effect.addFinalizer(() =>
							Ref.update(closes, (count) => count + 1),
						);
						return handle;
					}),
				tag: "scripted",
			};
			const fabric = yield* makeSessionFabric;
			const starting = yield* fabric
				.withStartAdmission((permit) =>
					fabric.start(
						permit,
						"agent-fabric",
						backend,
						options,
						() => Effect.succeed(true),
						(attachment) => attachment.handle.queue("recover"),
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
					() => Effect.succeed(true),
					(attachment) => attachment.handle.queue("retry"),
				),
			);
			expect(yield* Ref.get(opens)).toBe(2);
			expect(yield* Ref.get(queued)).toBe(true);
		}),
	),
);
