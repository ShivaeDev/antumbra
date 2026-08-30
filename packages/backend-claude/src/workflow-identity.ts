import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SubsessionOutcome } from "@antumbra/vocabulary/session-events";
import { isRecord } from "#blocks.ts";

type SystemMessage = Extract<SDKMessage, { type: "system" }>;
type TaskProgress = Extract<SystemMessage, { subtype: "task_progress" }>;

export interface WorkflowIdentity {
	readonly ended: typeof SubsessionOutcome.Type | undefined;
	readonly label: string | undefined;
	readonly model: string | undefined;
	readonly phase: string | undefined;
	readonly spawnedBy: string | undefined;
}

const stringAt = (entry: Record<string, unknown>, field: string) => (typeof entry[field] === "string" ? entry[field] : undefined);

// why: a workflow agent reports state as it works, and only the terminal words
// end a node. `blocked` is the provider's word for an agent a safety classifier
// refused to run, which is a failure to do the work rather than a way of
// finishing it. A word this vocabulary does not own leaves the node open: the
// record would rather say it stopped seeing than guess at an ending.
const endingOf = (state: string | undefined): typeof SubsessionOutcome.Type | undefined => {
	if (state === "done") return "completed";
	return state === "error" || state === "blocked" ? "failed" : undefined;
};

// why: the label the workflow gives an agent reads as its phase and its own
// name together, which is how the provider titles it and how a reader finds it
// among a run's siblings.
const labelOf = (entry: Record<string, unknown>): string | undefined => {
	const label = stringAt(entry, "label");
	const phase = stringAt(entry, "phaseTitle");
	if (label === undefined) return phase;
	return phase === undefined ? label : `${phase}: ${label}`;
};

const identityOf = (entry: Record<string, unknown>, spawnedBy: string | undefined): WorkflowIdentity => ({
	ended: endingOf(stringAt(entry, "state")),
	label: labelOf(entry),
	model: stringAt(entry, "model"),
	phase: stringAt(entry, "phaseTitle"),
	spawnedBy,
});

const snapshot = (message: TaskProgress): ReadonlyArray<unknown> => {
	const carried = "workflow_progress" in message && message.workflow_progress;
	return Array.isArray(carried) ? carried : [];
};

export interface WorkflowIdentities {
	readonly observe: (message: TaskProgress) => void;
	readonly of: (agentId: string) => WorkflowIdentity | undefined;
}

// why: progress frames are telemetry and this record does not keep them. The
// one thing they hold that exists nowhere else is who a workflow's agents are:
// the frame names the tool call that started the run, and its undocumented
// snapshot names each agent, what it was asked to be, what it runs on, and
// whether it is still running. That much is identity and it names the nodes;
// the counters and previews around it are the noise the ruling drops.
export const openWorkflowIdentities = (): WorkflowIdentities => {
	const identities = new Map<string, WorkflowIdentity>();
	return {
		observe: (message) => {
			for (const entry of snapshot(message)) {
				if (!isRecord(entry) || entry.type !== "workflow_agent") {
					continue;
				}
				const agentId = stringAt(entry, "agentId");
				if (agentId !== undefined) {
					identities.set(agentId, identityOf(entry, message.tool_use_id));
				}
			}
		},
		of: (agentId) => identities.get(agentId),
	};
};
