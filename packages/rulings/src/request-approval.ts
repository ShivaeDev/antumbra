import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import type { RulingApprovalRequest, RulingRequest } from "#acts.ts";
import { APPROVAL_CHOICES, APPROVAL_QUESTION } from "#approval-choices.ts";
import { openApprovalRow, standingApprovalRows } from "#approval-rows.ts";
import { ApprovalAlreadyOpen, PlotEmpty, PlotUnchanged } from "#errors.ts";
import { approvedPieceIdsOf, loadRuling } from "#read.ts";
import { requested, writeRequest } from "#request.ts";
import type { StoredRuling } from "#stored-rows.ts";

const askedOf = (input: RulingApprovalRequest): RulingRequest => ({
	choices: APPROVAL_CHOICES,
	context: input.context,
	gates: [],
	question: APPROVAL_QUESTION,
	radius: "voyage",
	requester: { agentId: input.requesterAgentId, kind: "agent" },
	rung: "admiral",
	subjects: [
		{ id: input.voyageId, kind: "voyage" },
		{ id: input.requesterAgentId, kind: "agent" },
	],
	urgency: "pressing",
});

const sameSet = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
	left.length === right.length && left.every((id) => right.includes(id));

const admitsPlot = (input: RulingApprovalRequest) =>
	Effect.gen(function* () {
		if (input.pieceIds.length === 0) {
			return yield* new PlotEmpty({ voyageId: input.voyageId });
		}
		const open = yield* openApprovalRow(input.voyageId);
		if (Option.isSome(open)) {
			return yield* new ApprovalAlreadyOpen({ approvalId: open.value.id, voyageId: input.voyageId });
		}
		const standing = (yield* standingApprovalRows(input.voyageId)).at(-1);
		if (standing !== undefined && sameSet(yield* approvedPieceIdsOf(standing.id), input.pieceIds)) {
			return yield* new PlotUnchanged({ approvalId: standing.id, voyageId: input.voyageId });
		}
	});

export const requestApproval = Effect.fn("rulings.requestApproval")(function* (input: RulingApprovalRequest) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	yield* admitsPlot(input);
	const asked = askedOf(input);
	const row: StoredRuling = { ...requested(asked, now), kind: "approval" };
	yield* writeRequest(row, asked);
	yield* Effect.forEach(input.pieceIds, (pieceId) => db.RulingApprovedPiece.create({ pieceId, rulingId: row.id }));
	const approval = yield* loadRuling(row);
	yield* feeds.publishRulingRefresh();
	yield* feeds.publishVoyageRefresh();
	return approval;
});
