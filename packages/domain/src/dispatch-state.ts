import { Clock, Effect, Queue, Ref } from "effect";
import { nextBackoffMillis } from "#dispatch-policy.ts";

// why: nothing here is persisted. After a crash the durable Agent assignment
// keeps its Piece active while Session recovery resumes it; a failed dormant
// birth releases the Piece through that status. A durable in-flight table
// would only duplicate the rows and Intents that already say everything.
export interface DispatchState {
	readonly failures: Ref.Ref<ReadonlyMap<string, number>>;
	readonly inFlight: Ref.Ref<ReadonlyMap<string, string>>;
	readonly skipUntil: Ref.Ref<ReadonlyMap<string, number>>;
	readonly tick: Queue.Queue<void>;
}

export const makeDispatchState: Effect.Effect<DispatchState> = Effect.gen(
	function* () {
		return {
			failures: yield* Ref.make<ReadonlyMap<string, number>>(new Map()),
			inFlight: yield* Ref.make<ReadonlyMap<string, string>>(new Map()),
			skipUntil: yield* Ref.make<ReadonlyMap<string, number>>(new Map()),
			// why: the kernel's trick — a sliding capacity-1 queue collapses any
			// number of wake signals into at most one pending pass.
			tick: yield* Queue.sliding<void>(1),
		};
	},
);

const withKey = <A>(map: ReadonlyMap<string, A>, key: string, value: A) =>
	new Map(map).set(key, value);

const withoutKey = <A>(map: ReadonlyMap<string, A>, key: string) => {
	const next = new Map(map);
	next.delete(key);
	return next;
};

export const holdInFlight = (
	state: DispatchState,
	pieceId: string,
	intentId: string,
) => Ref.update(state.inFlight, (map) => withKey(map, pieceId, intentId));

export const releaseInFlight = (state: DispatchState, pieceId: string) =>
	Ref.update(state.inFlight, (map) => withoutKey(map, pieceId));

export const recordSuccess = (state: DispatchState, pieceId: string) =>
	Ref.update(state.failures, (map) => withoutKey(map, pieceId)).pipe(
		Effect.andThen(
			Ref.update(state.skipUntil, (map) => withoutKey(map, pieceId)),
		),
	);

export const recordFailure = (
	state: DispatchState,
	pieceId: string,
	patienceMillis: number,
) =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const consecutive =
			((yield* Ref.get(state.failures)).get(pieceId) ?? 0) + 1;
		yield* Ref.update(state.failures, (map) =>
			withKey(map, pieceId, consecutive),
		);
		yield* Ref.update(state.skipUntil, (map) =>
			withKey(
				map,
				pieceId,
				now + nextBackoffMillis(consecutive, patienceMillis),
			),
		);
	});

export const dispatchable = (state: DispatchState, now: number) =>
	Effect.gen(function* () {
		const inFlight = yield* Ref.get(state.inFlight);
		const skipUntil = yield* Ref.get(state.skipUntil);
		return (pieceId: string) =>
			!inFlight.has(pieceId) && (skipUntil.get(pieceId) ?? 0) <= now;
	});
