import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { MailHistory } from "@antumbra/server-storage/mail/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { dueWakes } from "#due-wakes.ts";
import { initialize } from "#initialize.ts";
import { markDelivered } from "#mark-delivered.ts";
import { markRead } from "#mark-read.ts";
import { mailbox, unread } from "#read.ts";
import { send } from "#send.ts";

export const Mail = defineService({
	id: "@antumbra/server-mail/Mail",
	requires: [ExecutionHistory, Records, MailHistory],
	initialize: initialize,
	methods: (serial) => ({
		send: send(serial),
		markDelivered: markDelivered(serial),
		markRead: markRead(serial),
		mailbox,
		unread,
		dueWakes,
	}),
});
