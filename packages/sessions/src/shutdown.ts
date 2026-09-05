import type { IntentStatus } from "@antumbra/kernel";
import { Data } from "effect";

export class SessionShutdownIncomplete extends Data.TaggedError("SessionShutdownIncomplete")<{
	readonly intentId: string;
	readonly sessionId: string;
	readonly status: IntentStatus | "missing";
}> {}
