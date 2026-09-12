import { identity } from "@antumbra/domain-agents/ids.ts";
import { MessageId } from "@antumbra/domain-mail/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const HAND_REQUEST = Id.Request.make("agent-hand");

export const HAND = identity(HAND_REQUEST).agentId;

export const MATE = "agent-mate";

export const messageOf = (name: string): MessageId => MessageId.make(`mail:${name}`);

export const sending = (name: string, toAgentId: string = HAND) => ({
	authorAgentId: null,
	body: `the ${name} is closed to deep draught`,
	precedence: "priority" as const,
	requestId: Id.Request.make(`mail:${name}`),
	toAgentId,
});
