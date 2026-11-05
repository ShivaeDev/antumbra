import { markDelivered } from "@antumbra/domain-mail/commands/mark-delivered.ts";
import { markRead } from "@antumbra/domain-mail/commands/mark-read.ts";
import { send } from "@antumbra/domain-mail/commands/send.ts";
import { dueWakes } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { mailbox } from "@antumbra/domain-mail/queries/mailbox.ts";
import { unread } from "@antumbra/domain-mail/queries/unread.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";

const rows = collection("message", Schema.String);
export const Send = command("send", { payload: send.Input, success: Schema.Number, rejections: send.Rejection, invalidates: () => [] });
export const MarkDelivered = command("markDelivered", {
	payload: markDelivered.Input,
	success: Schema.Number,
	rejections: markDelivered.Rejection,
	invalidates: () => [],
});
export const MarkRead = command("markRead", {
	payload: markRead.Input,
	success: Schema.Number,
	rejections: markRead.Rejection,
	invalidates: () => [],
});
export const Mailbox = query("mailbox", {
	readPolicy: signedIn,
	payload: mailbox.input,
	success: mailbox.output,
	reads: (input) => [{ _tag: "Bucket", collection: "message", field: "toAgentId", value: input.agentId }],
});
export const Unread = query("unread", {
	readPolicy: signedIn,
	payload: unread.input,
	success: unread.output,
	reads: (input) => [{ _tag: "Bucket", collection: "message", field: "toAgentId", value: input.agentId }],
});
export const DueWakes = query("dueWakes", {
	readPolicy: signedIn,
	payload: dueWakes.input,
	success: dueWakes.output,
	reads: () => [rows.list, ...["agent", "session", "sessionOperation", "count", "voyageAgent"].map((name) => collection(name, Schema.String).list)],
});
export const MailContract = contract("mail", { commands: [Send, MarkDelivered, MarkRead], queries: [Mailbox, Unread, DueWakes] });
