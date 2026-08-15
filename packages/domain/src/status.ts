import { Data, Result, Schema } from "effect";

export const AgentStatusSchema = Schema.Literals([
	"alive",
	"dormant",
	"retired",
]);
export type AgentStatus = typeof AgentStatusSchema.Type;

export const AGENT_STATUS_EVENTS = ["reclaim", "retire"] as const;
export type AgentStatusEvent = (typeof AGENT_STATUS_EVENTS)[number];

export class InvalidAgentTransition extends Data.TaggedError(
	"InvalidAgentTransition",
)<{
	readonly event: AgentStatusEvent;
	readonly from: AgentStatus;
}> {}

// why: spawn creates the row directly in "alive" — birth is not a transition.
// Dormant has no way back in v0: revival is deliberately absent, so the table
// makes resurrection unrepresentable instead of discouraged.
const TABLE: Record<
	AgentStatus,
	Partial<Record<AgentStatusEvent, AgentStatus>>
> = {
	alive: { reclaim: "dormant", retire: "retired" },
	dormant: { retire: "retired" },
	retired: {},
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
