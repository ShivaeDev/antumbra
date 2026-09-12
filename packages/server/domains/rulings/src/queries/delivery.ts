import { captainReading } from "@antumbra/domain-agents/rows/captain-reading.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { MessageId } from "@antumbra/domain-mail/ids.ts";
import { message } from "@antumbra/domain-mail/rows/message.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionToolCall } from "@antumbra/domain-sessions/rows/session-tool-call.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { askNoticeId, parkNoticeId, RulingId } from "#ids.ts";
import { ascentWords } from "#queries/ascent-words.ts";
import { heldBy } from "#queries/held.ts";
import { answerWords, notNowWords, questionBackWords } from "#queries/mail-words.ts";
import { rulingNoticeReceipt } from "#rows/notice-receipt.ts";
import { type Ruling, ruling } from "#rows/ruling.ts";
export const RulingDelivery = Schema.Struct({
	rulingId: RulingId,
	kind: Schema.Literals(["answer", "notice", "ascent"]),
	requestId: Schema.String,
	body: Schema.String,
	toAgentId: Schema.String,
});
export type RulingDelivery = typeof RulingDelivery.Type;

const requesterNotices = (current: Ruling, requester: string, receipts: ReadonlySet<string>): RulingDelivery[] => {
	const notices: RulingDelivery[] = [];
	if (current.answer !== null && current.deliveredAt === null)
		notices.push({ kind: "answer", rulingId: current.id, toAgentId: requester, requestId: `ruling:${current.id}`, body: answerWords(current) });
	for (const context of current.contexts) {
		const id = askNoticeId(current.id, context.id);
		if (context.authorAgentId === null && !receipts.has(id))
			notices.push({
				kind: "notice",
				rulingId: current.id,
				toAgentId: requester,
				requestId: id,
				body: questionBackWords(current, context.body),
			});
	}
	const parked = current.parked;
	const parkId = parkNoticeId(current.id);
	if (parked !== null && !receipts.has(parkId))
		notices.push({ kind: "notice", rulingId: current.id, toAgentId: requester, requestId: parkId, body: notNowWords(current, parked.note) });

	return notices;
};
export const delivery = query("delivery", {
	input: {},
	output: Schema.Array(RulingDelivery),
	reads: [ruling, rulingNoticeReceipt, message, session, sessionToolCall, voyage, voyageAgent, captainReading],
	run: Effect.fn("rulings.delivery")(function* (_input, rows) {
		const sessions = yield* rows.session.where({ status: "open" });
		const calls = (yield* rows.sessionToolCall.where({ answer: null, answeredAt: null })).filter((call) =>
			sessions.some((session) => session.id === call.sessionId),
		);
		const crews = yield* rows.voyageAgent.where({});
		const captains = yield* rows.captainReading.where({});
		const flagship = (yield* rows.voyage.where({ kind: "flagship" }))[0];
		const receipts = new Set((yield* rows.rulingNoticeReceipt.where({})).map((receipt) => receipt.id));
		const result: RulingDelivery[] = [];
		for (const current of yield* rows.ruling.where({})) {
			if (current.requester.kind !== "agent") continue;
			const requester = current.requester.agentId;
			const held = calls.some((call) => sessions.find((session) => session.id === call.sessionId)?.agentId === requester && heldBy(current, call));
			if (!held) result.push(...requesterNotices(current, requester, receipts));
			if (current.answer !== null || current.rung === null || current.rung === "admiral") continue;
			const voyageId = current.rung === "flagship" ? flagship?.id : crews.find((crew) => crew.agentId === requester)?.voyageId;
			const destination = captains.find((captain) => captain.voyageId === voyageId)?.agentId;
			if (destination === undefined || destination === null || destination === requester) continue;
			const id = `ruling-ascent:${current.id}:${destination}`;
			if (!(yield* rows.message.exists(MessageId.make(id))))
				result.push({ kind: "ascent", rulingId: current.id, toAgentId: destination, requestId: id, body: ascentWords(current) });
		}
		return result;
	}),
});
