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

// Observed workflow states end with `done`, `error`, or `blocked`; `blocked` is a refused run.
const endingOf = (state: string | undefined): typeof SubsessionOutcome.Type | undefined => {
	if (state === "done") return "completed";
	return state === "error" || state === "blocked" ? "failed" : undefined;
};

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

// `workflow_progress` is absent from the published SDK types; live progress frames carry the workflow-agent identity snapshot.
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
