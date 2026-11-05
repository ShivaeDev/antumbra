import { command } from "@antumbra/platform-feature/command.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { Schema } from "effect";
import { messageRead } from "#facts/message-read.ts";
import { message } from "#rows/message.ts";

export const markRead = command("markRead", {
	input: { agentId: Schema.String, ids: Schema.Array(MessageId) },
	reads: [message],
	emits: messageRead,
	rejections: { NotAddressed: { id: Schema.String } },
});
