import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";

export const request = (name: string) => Request.make(name);
export const messageOf = (name: string) => MessageId.make(`mail:${name}`);
export const sending = (name: string, toAgentId: string = "hand") => ({
	requestId: request(messageOf(name)),
	toAgentId,
	authorAgentId: null,
	body: `  ${name}  `,
	precedence: "routine" as const,
});
