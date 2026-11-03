import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { dueWakes } from "#due-wakes.ts";
import { initialize } from "#initialize.ts";
import { markDelivered } from "#mark-delivered.ts";
import { markRead } from "#mark-read.ts";
import { observeWake } from "#observe-wake.ts";
import { mailbox, unread } from "#read.ts";
import { send } from "#send.ts";

export const Mail = defineService({
	id: "@antumbra/server-mail/Mail",
	requires: [MailHistory],
	initialize: initialize,
	methods: (serial) => ({
		send: send(serial),
		markDelivered: markDelivered(serial),
		markRead: markRead(serial),
		observeWake: observeWake(serial),
		mailbox,
		unread,
		dueWakes,
	}),
});
