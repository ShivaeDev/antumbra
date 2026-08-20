import { Data, Result } from "effect";
import {
	type AgentStatus,
	AgentStatusSchema,
} from "#agent-runtime/statuses.ts";

export const AGENT_STATUS_EVENTS = ["activate", "reclaim", "retire"] as const;
export type AgentStatusEvent = (typeof AGENT_STATUS_EVENTS)[number];

export class InvalidAgentTransition extends Data.TaggedError(
	"InvalidAgentTransition",
)<{
	readonly event: AgentStatusEvent;
	readonly from: AgentStatus;
}> {}

// why: dormant has no way back in v0: revival is deliberately absent, so the
// table makes resurrection unrepresentable instead of discouraged.
const TABLE: Record<
	AgentStatus,
	Partial<Record<AgentStatusEvent, AgentStatus>>
> = {
	alive: { reclaim: "dormant", retire: "retired" },
	dormant: { retire: "retired" },
	retired: {},
	spawning: { activate: "alive", reclaim: "dormant", retire: "retired" },
};

export const AGENT_STATUSES = AgentStatusSchema.literals;

export const agentTransition = (
	from: AgentStatus,
	event: AgentStatusEvent,
): Result.Result<AgentStatus, InvalidAgentTransition> => {
	const next = TABLE[from][event];
	return next === undefined
		? Result.fail(new InvalidAgentTransition({ event, from }))
		: Result.succeed(next);
};
