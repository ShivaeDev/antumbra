import type { BackendFailure } from "@antumbra/plugin-api";
import { type Deferred, Effect, Option, Ref } from "effect";
import { codexFailure } from "#failure.ts";

export interface PendingInput {
	readonly accepted: Deferred.Deferred<void, BackendFailure>;
	readonly text: string;
}

export interface OpenTurnState {
	readonly _tag: "open";
	readonly pending: ReadonlyArray<PendingInput>;
	readonly turn: Option.Option<string>;
}

export interface ClosedTurnState {
	readonly _tag: "closed";
}

export type TurnState = ClosedTurnState | OpenTurnState;

export const closed: ClosedTurnState = { _tag: "closed" };

export const SESSION_CLOSED = codexFailure(
	"session closed before delivery reached the provider",
);

export const idle: OpenTurnState = {
	_tag: "open",
	pending: [],
	turn: Option.none(),
};

export const withPending = (
	state: OpenTurnState,
	input: PendingInput,
): OpenTurnState => ({
	...state,
	pending: [...state.pending, input],
});

export const withTurn = (
	state: OpenTurnState,
	turnId: string,
): OpenTurnState => ({
	...state,
	turn: Option.some(turnId),
});

export const withoutTurn = (state: OpenTurnState): OpenTurnState => ({
	...state,
	turn: Option.none(),
});

export const readyToFlush = (state: OpenTurnState): boolean =>
	Option.isNone(state.turn) && state.pending.length > 0;

export const recordAcceptedTurn = (state: Ref.Ref<TurnState>, turnId: string) =>
	Ref.modify(state, (current) =>
		current._tag === "closed"
			? [false, current]
			: [true, withTurn(current, turnId)],
	).pipe(
		Effect.flatMap((open) =>
			open ? Effect.void : Effect.fail(SESSION_CLOSED),
		),
	);

export const requireOpen = (state: Ref.Ref<TurnState>) =>
	Ref.get(state).pipe(
		Effect.flatMap((current) =>
			current._tag === "closed" ? Effect.fail(SESSION_CLOSED) : Effect.void,
		),
	);

export const observeTurn = (state: Ref.Ref<TurnState>, turnId: string) =>
	Ref.update(state, (current) =>
		current._tag === "closed" ? current : withTurn(current, turnId),
	);

export const closeTurnState = (state: Ref.Ref<TurnState>) =>
	Ref.getAndSet(state, closed);
