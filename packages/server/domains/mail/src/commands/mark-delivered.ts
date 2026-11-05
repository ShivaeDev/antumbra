import { command } from "@antumbra/platform-feature/command.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { Schema } from "effect";
import { messageDelivered } from "#facts/message-delivered.ts";
import { message } from "#rows/message.ts";

export const markDelivered = command("markDelivered", {
	input: { agentId: Schema.String, ids: Schema.Array(MessageId) },
	reads: [message],
	emits: messageDelivered,
	rejections: { NotAddressed: { id: Schema.String } },
});
