import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { MessageId } from "#ids.ts";

export const HAND = "agent-hand";

export const MATE = "agent-mate";

export const messageOf = (name: string): MessageId => MessageId.make(`mail:${name}`);

export const sending = (name: string, toAgentId: string = HAND) => ({
	authorAgentId: null,
	body: `the ${name} is closed to deep draught`,
	precedence: "priority" as const,
	requestId: Id.Request.make(`mail:${name}`),
	toAgentId,
});
