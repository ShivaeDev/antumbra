import type { IntentNotFound, IntentStatus, PayloadInvalid, StoredIntentInvalid, UnregisteredIntentTag } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import { Context, type Effect, type Stream } from "effect";
import type { WakeFields } from "#wake/input.ts";

// why: rousing reads the durable Intent rows before it decides, so a row it
// cannot read is a refusal of its own — one that submitting alone never had.
export type RouseRefused = PayloadInvalid | PrismaError | StoredIntentInvalid | UnregisteredIntentTag;

// why: the wake is handed back rather than fired and forgotten, because a
// caller that does not watch it is exactly how a parked wake became invisible.
// `retried` says which act this was: a fresh demand, or a second push at one
// the record already held.
export interface SessionRouse {
	readonly changes: Stream.Stream<IntentStatus, IntentNotFound | PrismaError>;
	readonly id: string;
	readonly retried: boolean;
}

// why: send and watch need the kernel's wake acts without naming spawn. The
// facade still owns KernelReach, including submitSpawn; this is the session
// half of that late-bound path, provided from the same deferred.
export class SessionReach extends Context.Service<
	SessionReach,
	{
		readonly rouseSession: (payload: WakeFields) => Effect.Effect<SessionRouse, RouseRefused>;
		readonly settleWakes: (sessionId: string) => Effect.Effect<void>;
	}
>()("@antumbra/sessions/SessionReach") {}
