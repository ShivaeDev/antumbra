import type { IntentNotFound, IntentStatus, PayloadInvalid, StoredIntentInvalid, UnregisteredIntentTag } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import { Context, type Effect, type Stream } from "effect";
import type { WakeFields } from "#wake/input.ts";

export type RouseRefused = PayloadInvalid | PrismaError | StoredIntentInvalid | UnregisteredIntentTag;

export interface SessionRouse {
	readonly changes: Stream.Stream<IntentStatus, IntentNotFound | PrismaError>;
	readonly id: string;
	readonly retried: boolean;
}

export class SessionReach extends Context.Service<
	SessionReach,
	{
		readonly rouseSession: (payload: WakeFields) => Effect.Effect<SessionRouse, RouseRefused>;
		readonly settleWakes: (sessionId: string) => Effect.Effect<void>;
		readonly wakePending: (sessionId: string) => Effect.Effect<boolean, RouseRefused>;
	}
>()("@antumbra/sessions/SessionReach") {}
