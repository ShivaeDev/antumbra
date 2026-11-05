import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { Schema } from "effect";
import { MailBatch } from "#queries/due-mail.ts";
import { message } from "#rows/message.ts";

export const DueWake = Schema.Struct({
	agentId: agent.fields.id,
	sessionId: session.fields.id,
	voyageId: Schema.NullOr(voyageAgent.fields.voyageId),
	batch: MailBatch,
	unreadIds: Schema.Array(MessageId),
	waitedMillis: Schema.Number,
});
export type DueWake = typeof DueWake.Type;

const DueWakes = Schema.Struct({ wakes: Schema.Array(DueWake), waitUntil: Schema.NullOr(Schema.Number) });

export const dueWakes = query("dueWakes", {
	input: {},
	output: DueWakes,
	reads: [message, agent, session, sessionOperation, count, voyageAgent],
});
