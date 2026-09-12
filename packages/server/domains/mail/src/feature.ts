import { feature } from "@antumbra/platform-feature/feature.ts";
import { markDelivered } from "#commands/mark-delivered.ts";
import { markRead } from "#commands/mark-read.ts";
import { send } from "#commands/send.ts";
import { messageDelivered } from "#facts/message-delivered.ts";
import { messageRead } from "#facts/message-read.ts";
import { messageSent } from "#facts/message-sent.ts";
import { messageDeliveredMaterializer } from "#materializers/message-delivered.ts";
import { messageReadMaterializer } from "#materializers/message-read.ts";
import { messageSentMaterializer } from "#materializers/message-sent.ts";
import { mailbox } from "#queries/mailbox.ts";
import { unread } from "#queries/unread.ts";
import { message } from "#rows/message.ts";

export const mail = feature("mail", {
	rows: [message],
	facts: [messageSent, messageDelivered, messageRead],
	commands: [send, markDelivered, markRead],
	materializers: [messageSentMaterializer, messageDeliveredMaterializer, messageReadMaterializer],
	queries: [unread, mailbox],
});
