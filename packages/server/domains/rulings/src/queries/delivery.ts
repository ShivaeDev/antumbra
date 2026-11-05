import { captainReading } from "@antumbra/domain-agents/rows/captain-reading.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { message } from "@antumbra/domain-mail/rows/message.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionToolCall } from "@antumbra/domain-sessions/rows/session-tool-call.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
import { rulingNoticeReceipt } from "#rows/notice-receipt.ts";
import { ruling } from "#rows/ruling.ts";
export const RulingDelivery = Schema.Struct({
	rulingId: RulingId,
	kind: Schema.Literals(["answer", "notice", "ascent"]),
	requestId: Schema.String,
	body: Schema.String,
	toAgentId: Schema.String,
});
export type RulingDelivery = typeof RulingDelivery.Type;
export const delivery = query("delivery", {
	input: {},
	output: Schema.Array(RulingDelivery),
	reads: [ruling, rulingNoticeReceipt, message, session, sessionToolCall, voyage, voyageAgent, captainReading],
});
