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
				.start(backend, options, () => Effect.succeed(true))
				.pipe(Effect.forkChild);
			yield* Deferred.await(firstEntered);
			const second = yield* fabric
				.start(backend, options, () => Effect.succeed(true))
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
				const attachment = yield* fabric.start(backend, options, () =>
					Effect.succeed(false),
				);
				const failure = yield* Effect.flip(attachment.openedNativeRef);
				expect(failure).toBeInstanceOf(SessionAttachmentFailure);
				expect(failure.detail).toContain("durably record native identity");
			}),
		),
);
