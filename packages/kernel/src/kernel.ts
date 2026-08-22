import type { PrismaError, WriteExecutors } from "@antumbra/persistence";
import { Context, type Effect, type Stream } from "effect";
import type {
	IntentNotFound,
	PayloadInvalid,
	StoredIntentInvalid,
	UnregisteredIntentTag,
} from "#errors.ts";
import type {
	ActiveIntentStatus,
	IntentStatus,
	InvalidTransition,
} from "#fsm.ts";
import type { IntentKind } from "#intent.ts";

export interface ActiveIntent<Payload> {
	readonly detail: string | null;
	readonly id: string;
	readonly payload: Payload;
	readonly status: ActiveIntentStatus;
}

export interface IntentSubmission {
	readonly changes: Stream.Stream<
		IntentStatus,
		IntentNotFound | PrismaError,
		WriteExecutors
	>;
	readonly id: string;
}

export interface IntentChange {
	readonly id: string;
	readonly status: IntentStatus;
}

// why: this service is the only way work starts. Submitters get an id and a
// status stream and nothing else — admission state (gates, running counts)
// never crosses this surface, which is the P6 acceptance line.
export class Kernel extends Context.Service<
	Kernel,
	{
		readonly active: <Payload>(
			kind: IntentKind<Payload>,
		) => Effect.Effect<
			ReadonlyArray<ActiveIntent<Payload>>,
			StoredIntentInvalid | UnregisteredIntentTag | PrismaError,
			WriteExecutors
		>;
		readonly cancel: (
			id: string,
		) => Effect.Effect<
			void,
			IntentNotFound | InvalidTransition | PrismaError,
			WriteExecutors
		>;
		readonly changes: (
			id: string,
		) => Stream.Stream<
			IntentStatus,
			IntentNotFound | PrismaError,
			WriteExecutors
		>;
		readonly retry: (
			id: string,
		) => Effect.Effect<
			void,
			IntentNotFound | InvalidTransition | PrismaError,
			WriteExecutors
		>;
		readonly submit: <Payload>(
			kind: IntentKind<Payload>,
			payload: NoInfer<Payload>,
		) => Effect.Effect<
			IntentSubmission,
			PayloadInvalid | UnregisteredIntentTag | PrismaError,
			WriteExecutors
		>;
		// why: `changes` answers about one Intent to whoever asked for it, and a
		// reader watching the whole board has no id to ask about. The scheduler
		// already fans every move out to observe it; this is that same fan-out
		// with no filter, so a surface showing pending demand can refresh on the
		// move rather than on whatever unrelated write happens next. It says what
		// moved and where to, never why it was admitted — admission state still
		// does not cross this surface.
		readonly transitions: Stream.Stream<IntentChange>;
	}
>()("@antumbra/kernel/Kernel") {}
