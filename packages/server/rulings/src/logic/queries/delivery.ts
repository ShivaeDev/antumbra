import { askNoticeId, parkNoticeId, RulingId } from "@antumbra/domain-rulings/ids.ts";
import { ascentWords } from "@antumbra/domain-rulings/queries/ascent-words.ts";
import type * as Source from "@antumbra/domain-rulings/queries/delivery.ts";
import { heldBy } from "@antumbra/domain-rulings/queries/held.ts";
import { answerWords, notNowWords, questionBackWords } from "@antumbra/domain-rulings/queries/mail-words.ts";
import type { Ruling } from "@antumbra/domain-rulings/rows/ruling.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { selection as captainReadingSelection } from "@antumbra/server-storage/records/captain-reading.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { selection as rulingNoticeReceiptSelection } from "@antumbra/server-storage/records/ruling-notice-receipt.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionToolCallSelection } from "@antumbra/server-storage/records/session-tool-call.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";
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
export const delivery = Effect.fn("rulings.delivery")(function* (
	_input: Schema.Struct.Type<typeof Source.delivery.input>,
): Effect.fn.Return<typeof Source.delivery.output.Type, never, Records> {
	const rows = yield* Records;

	const sessions = yield* rows.session
		.findMany({ where: { status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const calls = (yield* rows.sessionToolCall
		.findMany({ where: { answer: null, answeredAt: null }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionToolCallSelection })
		.pipe(Effect.orDie)).filter((call) => sessions.some((session) => session.id === call.sessionId));
	const crews = yield* rows.voyageAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
		.pipe(Effect.orDie);
	const captains = yield* rows.captainReading
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: captainReadingSelection })
		.pipe(Effect.orDie);
	const flagship = (yield* rows.voyage
		.findMany({ where: { kind: "flagship" }, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie))[0];
	const receipts = new Set(
		(yield* rows.rulingNoticeReceipt
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingNoticeReceiptSelection })
			.pipe(Effect.orDie)).map((receipt) => receipt.id),
	);
	const result: RulingDelivery[] = [];
	for (const current of yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie)) {
		if (current.requester.kind !== "agent") continue;
		const requester = current.requester.agentId;
		const held = calls.some((call) => sessions.find((session) => session.id === call.sessionId)?.agentId === requester && heldBy(current, call));
		if (!held) result.push(...requesterNotices(current, requester, receipts));
		if (current.answer !== null || current.rung === null || current.rung === "admiral") continue;
		const voyageId = current.rung === "flagship" ? flagship?.id : crews.find((crew) => crew.agentId === requester)?.voyageId;
		const destination = captains.find((captain) => captain.voyageId === voyageId)?.agentId;
		if (destination === undefined || destination === null || destination === requester) continue;
		const id = `ruling-ascent:${current.id}:${destination}`;
		if (
			!(yield* rows.message.count({ where: { id: MessageId.make(id) } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			))
		)
			result.push({ kind: "ascent", rulingId: current.id, toAgentId: destination, requestId: id, body: ascentWords(current) });
	}
	return result;
});
