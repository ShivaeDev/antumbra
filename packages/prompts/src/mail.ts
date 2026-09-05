import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";

const MailWaiting = Schema.Struct({
	count: Schema.Number,
	precedence: Schema.Literals(["flash", "priority", "routine"]),
});
type MailWaiting = typeof MailWaiting.Type;

const waiting = (input: MailWaiting): string =>
	input.count === 1
		? `1 mail waits on your board, at ${input.precedence}`
		: `${input.count} mail wait on your board, the most urgent at ${input.precedence}`;

export const mailWords = (input: MailWaiting): AgentPrompt =>
	agentPrompt(`${waiting(input)}. Read your mail and mark it read, then carry on with what it changes.`);
