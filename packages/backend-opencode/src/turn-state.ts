import type { BackendFailure } from "@antumbra/plugin-api";
import type { Deferred } from "effect";
import { opencodeFailure } from "#failure.ts";

export interface PendingText {
	readonly accepted: Deferred.Deferred<void, BackendFailure>;
	readonly text: string;
}

export interface OpenTurnState {
	readonly _tag: "open";
	readonly running: boolean;
	readonly pending: ReadonlyArray<PendingText>;
}

interface ClosedTurnState {
	readonly _tag: "closed";
}

export type TurnState = ClosedTurnState | OpenTurnState;

export const closed: ClosedTurnState = { _tag: "closed" };

export const idle: OpenTurnState = {
	_tag: "open",
	pending: [],
	running: false,
};

export const SESSION_CLOSED = opencodeFailure("session closed before delivery reached the provider");

export const withPending = (state: OpenTurnState, text: PendingText): OpenTurnState => ({ ...state, pending: [...state.pending, text] });

export const running = (state: OpenTurnState): OpenTurnState => ({
	...state,
	running: true,
});

export const rested = (state: OpenTurnState): OpenTurnState => ({
	...state,
	running: false,
});

export const sent = (state: TurnState): TurnState => (state._tag === "closed" ? state : { ...state, pending: state.pending.slice(1) });
