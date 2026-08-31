import type { BackendFailure } from "@antumbra/plugin-api";
import { Deferred, Effect, Ref } from "effect";
import type { TurnRequests } from "#turn-requests.ts";
import {
	closeTurnState,
	idle,
	type OpenTurnState,
	type PendingInput,
	readyToFlush,
	SESSION_CLOSED,
	type TurnState,
	withPending,
	withTurn,
} from "#turn-state.ts";

const completePending = (pending: ReadonlyArray<PendingInput>, complete: (input: PendingInput) => Effect.Effect<boolean>) =>
	Effect.forEach(pending, complete).pipe(Effect.asVoid);

const acceptPending = (pending: ReadonlyArray<PendingInput>) => completePending(pending, (input) => Deferred.succeed(input.accepted, undefined));

const failPending = (pending: ReadonlyArray<PendingInput>, failure: BackendFailure) =>
	completePending(pending, (input) => Deferred.fail(input.accepted, failure));

// Codex has no provider-side queue; pending inputs wait for the next local turn.
export const makeQueuedTurns = (
	state: Ref.Ref<TurnState>,
	withPermit: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
	requests: TurnRequests,
	failWhenClosed: Effect.Effect<never, BackendFailure>,
) => {
	const recordStarted = (current: OpenTurnState, acceptedInput: PendingInput, turnId: string) =>
		Ref.modify(state, (latest) =>
			latest._tag === "closed" ? [false, latest] : [true, withTurn({ ...latest, pending: latest.pending.slice(1) }, turnId)],
		).pipe(Effect.flatMap((open) => (open ? acceptPending([acceptedInput]) : failPending(current.pending, SESSION_CLOSED))));

	const recordFailed = (current: OpenTurnState, failure: BackendFailure) =>
		Ref.update(state, (latest) => (latest._tag === "closed" ? latest : idle)).pipe(
			Effect.andThen(failPending(current.pending, failure)),
			Effect.andThen(Effect.logWarning("codex: queued turn failed to start", failure)),
		);

	const startTurn = (current: OpenTurnState) => {
		const [next] = current.pending;
		if (next === undefined) {
			return Effect.void;
		}
		return requests.start(next.input).pipe(
			Effect.matchEffect({
				onFailure: (failure) => recordFailed(current, failure),
				onSuccess: (turnId) => recordStarted(current, next, turnId),
			}),
		);
	};

	const flush = Ref.get(state).pipe(
		Effect.flatMap((current) => (current._tag === "open" && readyToFlush(current) ? startTurn(current) : Effect.void)),
	);

	const queue = (sessionInput: PendingInput["input"]) =>
		Effect.gen(function* () {
			const accepted = yield* Deferred.make<void, BackendFailure>();
			const input: PendingInput = { accepted, input: sessionInput };
			yield* Ref.modify(state, (current) => (current._tag === "closed" ? [false, current] : [true, withPending(current, input)])).pipe(
				Effect.flatMap((open) => (open ? flush : Deferred.fail(accepted, SESSION_CLOSED).pipe(Effect.asVoid))),
				withPermit,
				Effect.raceFirst(failWhenClosed),
			);
			yield* Deferred.await(accepted);
		});

	const close = closeTurnState(state).pipe(
		Effect.flatMap((current) => (current._tag === "closed" ? Effect.void : failPending(current.pending, SESSION_CLOSED))),
	);

	return { close, flush, queue };
};
