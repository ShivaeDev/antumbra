import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import type { MailWakeEvidence } from "@antumbra/platform-vocabulary/mail-evidence.ts";

export const request = (name: string) => Request.make(name);
export const messageOf = (name: string) => MessageId.make(`mail:${name}`);
export const sending = (name: string, toAgentId = "hand") => ({
	requestId: request(messageOf(name)),
	toAgentId,
	authorAgentId: null,
	body: `  ${name}  `,
	precedence: "routine" as const,
});
export const resting = { id: "root", agentId: "hand", status: "open", executionStatus: "idle", parentSessionId: null, stoppedAt: null } as const;
export const evidence: typeof MailWakeEvidence.Type = {
	quietMillis: 60_000,
	agents: [{ id: "hand", status: "alive" }],
	sessions: [resting],
	crew: [],
};
