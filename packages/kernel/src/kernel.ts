import type { PrismaError } from "@antumbra/persistence";
import { Context, type Effect, type Stream } from "effect";
import type { IntentNotFound, PayloadInvalid, StoredIntentInvalid, UnregisteredIntentTag } from "#errors.ts";
import type { ActiveIntentStatus, IntentStatus, InvalidTransition } from "#fsm.ts";
import type { IntentKind } from "#intent.ts";

export interface ActiveIntent<Payload> {
	readonly detail: string | null;
	readonly id: string;
	readonly payload: Payload;
	readonly status: ActiveIntentStatus;
}

export interface IntentSubmission {
	readonly changes: Stream.Stream<IntentStatus, IntentNotFound | PrismaError, never>;
	readonly id: string;
}

export interface IntentChange {
	readonly id: string;
	readonly status: IntentStatus;
}

export class Kernel extends Context.Service<
	Kernel,
	{
		readonly active: <Payload>(
			kind: IntentKind<Payload>,
		) => Effect.Effect<ReadonlyArray<ActiveIntent<Payload>>, StoredIntentInvalid | UnregisteredIntentTag | PrismaError, never>;
		readonly cancel: (id: string) => Effect.Effect<void, IntentNotFound | InvalidTransition | PrismaError, never>;
		readonly changes: (id: string) => Stream.Stream<IntentStatus, IntentNotFound | PrismaError, never>;
		readonly retry: (id: string) => Effect.Effect<void, IntentNotFound | InvalidTransition | PrismaError, never>;
		readonly retryIfWaiting: (id: string, expectedDetail: string) => Effect.Effect<boolean, PrismaError, never>;
		readonly submit: <Payload>(
			kind: IntentKind<Payload>,
			payload: NoInfer<Payload>,
		) => Effect.Effect<IntentSubmission, PayloadInvalid | UnregisteredIntentTag | PrismaError, never>;
		readonly transitions: Stream.Stream<IntentChange>;
	}
>()("@antumbra/kernel/Kernel") {}
