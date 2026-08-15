import { Option } from "effect";

export interface TurnState {
	readonly pending: ReadonlyArray<string>;
	readonly turn: Option.Option<string>;
}

export const idle: TurnState = { pending: [], turn: Option.none() };

export const withPending = (state: TurnState, text: string): TurnState => ({
	...state,
	pending: [...state.pending, text],
});

export const withTurn = (state: TurnState, turnId: string): TurnState => ({
	...state,
	turn: Option.some(turnId),
});

export const withoutTurn = (state: TurnState): TurnState => ({
	...state,
	turn: Option.none(),
});

export const readyToFlush = (state: TurnState): boolean =>
	Option.isNone(state.turn) && state.pending.length > 0;
