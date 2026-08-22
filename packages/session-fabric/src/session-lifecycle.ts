import { Deferred, Effect, Ref, Semaphore } from "effect";
import { SessionAttachmentFailure } from "#errors.ts";

interface StopState {
	readonly pending: number;
	readonly signal: Deferred.Deferred<void>;
}

interface SessionLifecycle {
	readonly gate: Semaphore.Semaphore;
	readonly stopState: Ref.Ref<StopState>;
}

export interface SessionLifecycles {
	readonly admit: <E, R>(
		sessionId: string,
		admission: Effect.Effect<void, E, R>,
	) => Effect.Effect<void, SessionAttachmentFailure | E, R>;
	readonly stop: <A, E, R>(
		sessionId: string,
		teardown: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E, R>;
}

const stopped = (signal: Deferred.Deferred<void>) =>
	Deferred.await(signal).pipe(
		Effect.andThen(
			Effect.fail(
				new SessionAttachmentFailure({
					detail: "session stopped while attaching",
				}),
			),
		),
	);

export const makeSessionLifecycles = Effect.gen(function* () {
	const lifecycles = yield* Ref.make<ReadonlyMap<string, SessionLifecycle>>(
		new Map(),
	);
	const lifecycleFor = (sessionId: string) =>
		Effect.gen(function* () {
			const candidate: SessionLifecycle = {
				gate: yield* Semaphore.make(1),
				stopState: yield* Ref.make({
					pending: 0,
					signal: yield* Deferred.make<void>(),
				}),
			};
			return yield* Ref.modify(lifecycles, (current) => {
				const existing = current.get(sessionId);
				return existing === undefined
					? [candidate, new Map(current).set(sessionId, candidate)]
					: [existing, current];
			});
		});
	const admit: SessionLifecycles["admit"] = (sessionId, admission) =>
		Effect.gen(function* () {
			const lifecycle = yield* lifecycleFor(sessionId);
			const { signal } = yield* Ref.get(lifecycle.stopState);
			return yield* lifecycle.gate
				.withPermits(1)(admission)
				.pipe(Effect.raceFirst(stopped(signal)));
		});
	const stop: SessionLifecycles["stop"] = (sessionId, teardown) =>
		Effect.gen(function* () {
			const lifecycle = yield* lifecycleFor(sessionId);
			// why: the signal precedes the permit wait, so attachment admission
			// cannot outrun durable retirement and install work afterward.
			return yield* Effect.acquireUseRelease(
				Effect.gen(function* () {
					const replacement = yield* Deferred.make<void>();
					const signal = yield* Ref.modify(lifecycle.stopState, (state) => [
						state.signal,
						{ pending: state.pending + 1, signal: state.signal },
					]);
					yield* Deferred.succeed(signal, undefined);
					return replacement;
				}),
				() => lifecycle.gate.withPermits(1)(teardown),
				(replacement) =>
					Ref.update(lifecycle.stopState, (state) =>
						state.pending === 1
							? { pending: 0, signal: replacement }
							: { pending: state.pending - 1, signal: state.signal },
					),
			);
		});
	return { admit, stop } satisfies SessionLifecycles;
});
