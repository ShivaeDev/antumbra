import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { APPROVE } from "#approval-choices.ts";
import type { StoredRuling } from "#stored-rows.ts";

const approvalsNaming = (voyageId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const named = yield* db.RulingSubject.where({ kind: "voyage", voyageId }).select("rulingId").all();
		const ids = named.map((row) => row.rulingId);
		return ids.length === 0
			? []
			: yield* db.Ruling.where({ kind: "approval" })
					.where((ruling) => ruling.id.in(ids))
					.all();
	});

export const choseApprove = (row: StoredRuling) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return row.answerChoiceId !== null && (yield* db.RulingChoice.where({ id: row.answerChoiceId, label: APPROVE }).exists());
	});

export const openApprovalRow = (voyageId: string) =>
	Effect.map(approvalsNaming(voyageId), (rows) => Option.fromUndefinedOr(rows.find((row) => row.ruledAt === null)));

const byRuledAt = (left: StoredRuling, right: StoredRuling): number => (left.ruledAt?.getTime() ?? 0) - (right.ruledAt?.getTime() ?? 0);

export const standingApprovalRows = (voyageId: string) =>
	Effect.gen(function* () {
		const rows = yield* approvalsNaming(voyageId);
		const standing = rows.filter((row) => row.ruledAt !== null && row.supersededById === null && row.withdrawnAt === null);
		const approved = yield* Effect.forEach(standing, (row) => Effect.map(choseApprove(row), (chose) => (chose ? [row] : [])));
		return approved.flat().sort(byRuledAt);
	});
