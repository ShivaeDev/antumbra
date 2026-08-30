import type { BackendFailure } from "@antumbra/plugin-api";
import type { Deferred } from "effect";
import { opencodeFailure } from "#failure.ts";

export interface PendingText {
	readonly accepted: Deferred.Deferred<void, BackendFailure>;
	readonly text: string;
}

export interface OpenTurnState {
	readonly _tag: "open";
	// why: the session is marked working the moment the server takes a prompt,
	// not when it says so. The status frame that confirms it arrives a moment
	// later, and a second prompt sent inside that gap would land in the turn the
	// first one started instead of waiting for it.
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

export const SESSION_CLOSED = opencodeFailure(
	"session closed before delivery reached the provider",
);

export const withPending = (
	state: OpenTurnState,
	text: PendingText,
): OpenTurnState => ({ ...state, pending: [...state.pending, text] });

export const running = (state: OpenTurnState): OpenTurnState => ({
	...state,
	running: true,
});

export const rested = (state: OpenTurnState): OpenTurnState => ({
	...state,
	running: false,
});

// why: the text at the head of the queue has reached the provider and stops
// being pending. A session closed while it was in flight stays closed.
export const sent = (state: TurnState): TurnState =>
	state._tag === "closed"
		? state
		: { ...state, pending: state.pending.slice(1) };
