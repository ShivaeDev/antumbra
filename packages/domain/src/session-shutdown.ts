import type {
	IntentNotFound,
	IntentStatus,
	PayloadInvalid,
	StoredIntentInvalid,
	UnregisteredIntentTag,
} from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type {
	InvalidSessionExecutionStatus,
	StoredAgentSessionStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Context, Data, type Effect } from "effect";

export class SessionShutdownIncomplete extends Data.TaggedError(
	"SessionShutdownIncomplete",
)<{
	readonly intentId: string;
	readonly sessionId: string;
	readonly status: IntentStatus | "missing";
}> {}

type SessionShutdownFailure =
	| IntentNotFound
	| InvalidSessionExecutionStatus
	| PayloadInvalid
	| PrismaError
	| SessionShutdownIncomplete
	| StoredAgentSessionStatusInvalid
	| StoredIntentInvalid
	| UnregisteredIntentTag;

export class SessionShutdown extends Context.Service<
	SessionShutdown,
	{
		readonly drain: Effect.Effect<void, SessionShutdownFailure>;
	}
>()("@antumbra/domain/SessionShutdown") {}

export const drainActiveSessions = SessionShutdown.use(
	(shutdown) => shutdown.drain,
);
