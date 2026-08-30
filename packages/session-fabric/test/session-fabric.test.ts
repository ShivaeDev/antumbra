import type { AgentBackend, SessionHandle } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Ref, Stream } from "effect";
import { SessionAttachmentFailure } from "#errors.ts";
import { SessionFabric } from "#fabric.ts";
import { idleHandle, options, refusingSink, scriptedBackend, sink } from "#test/fabric-fixtures.ts";

it.live("concurrent starts attach one backend handle per session", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const firstEntered = yield* Deferred.make<void>();
			const release = yield* Deferred.make<void>();
			const opens = yield* Ref.make(0);
			const backend = scriptedBackend(() =>
				Effect.gen(function* () {
					yield* Ref.update(opens, (count) => count + 1);
					yield* Deferred.succeed(firstEntered, undefined);
					yield* Deferred.await(release);
					return idleHandle;
				}),
			);
			const fabric = yield* SessionFabric;
			const first = yield* fabric
				.withStartAdmission((permit) => fabric.start(permit, "agent-fabric", backend, options, sink, () => Effect.void))
				.pipe(Effect.forkChild);
			yield* Deferred.await(firstEntered);
			const second = yield* fabric
				.withStartAdmission((permit) => fabric.start(permit, "agent-fabric", backend, options, sink, () => Effect.void))
				.pipe(Effect.forkChild({ startImmediately: true }));
			yield* Deferred.succeed(release, undefined);
			yield* Fiber.join(first);
			yield* Fiber.join(second);
			expect(yield* Ref.get(opens)).toBe(1);
		}),
	).pipe(Effect.provide(SessionFabric.layer, { local: true })),
);

it.live("one Agent cannot attach two different Sessions", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const entered = yield* Deferred.make<void>();
			const release = yield* Deferred.make<void>();
			const opens = yield* Ref.make(0);
			const backend = scriptedBackend(() =>
				Ref.update(opens, (count) => count + 1).pipe(
					Effect.andThen(Deferred.succeed(entered, undefined)),
					Effect.andThen(Deferred.await(release)),
					Effect.as(idleHandle),
				),
			);
			const fabric = yield* SessionFabric;
			const first = yield* fabric
				.withStartAdmission((permit) => fabric.start(permit, "agent-fabric", backend, options, sink, () => Effect.void))
				.pipe(Effect.forkChild);
			yield* Deferred.await(entered);
			const second = yield* fabric
				.withStartAdmission((permit) =>
					fabric.start(permit, "agent-fabric", backend, { ...options, sessionId: "session-other" }, sink, () => Effect.void),
				)
				.pipe(Effect.forkChild({ startImmediately: true }));
			yield* Deferred.succeed(release, undefined);
			yield* Fiber.join(first);
			const failure = yield* Effect.flip(Fiber.join(second));
			expect(failure).toBeInstanceOf(SessionAttachmentFailure);
			expect(yield* Ref.get(opens)).toBe(1);
		}),
	).pipe(Effect.provide(SessionFabric.layer, { local: true })),
);

it.live("native identity is not confirmed when its event was not persisted", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const handle: SessionHandle = {
				...idleHandle,
				events: Stream.make({
					nativeRef: "native-fabric",
					raw: { kind: "session/opened", payload: "{}", source: "scripted" },
					type: "session.opened",
				}),
			};
			const backend: AgentBackend = scriptedBackend(() => Effect.succeed(handle));
			const fabric = yield* SessionFabric;
			const failure = yield* Effect.flip(
				fabric.withStartAdmission((permit) =>
					fabric.start(permit, "agent-fabric", backend, options, refusingSink, (attachment) => attachment.openedNativeRef.pipe(Effect.asVoid)),
				),
			);
			expect(failure).toBeInstanceOf(SessionAttachmentFailure);
			expect(failure.detail).toContain("durably record native identity");
		}),
	).pipe(Effect.provide(SessionFabric.layer, { local: true })),
);
