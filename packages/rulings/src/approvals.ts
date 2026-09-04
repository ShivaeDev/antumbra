import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { choseApprove } from "#approval-rows.ts";
import type { VoyageApproval } from "#model.ts";
import { approvedPieceIdsOf } from "#read.ts";
import { invalidRulingValue } from "#stored.ts";
import type { StoredRuling } from "#stored-rows.ts";

const approvalOf = (row: StoredRuling) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const named = yield* db.RulingSubject.where({ kind: "voyage", rulingId: row.id }).select("voyageId").first();
		const voyageId = Option.flatMap(named, (subject) => Option.fromNullOr(subject.voyageId));
		if (Option.isNone(voyageId)) {
			return yield* invalidRulingValue("voyage subject", row.id, row);
		}
		return {
			approvalId: row.id,
			pieceIds: yield* approvedPieceIdsOf(row.id),
			requestedAt: row.createdAt,
			ruledAt: row.ruledAt,
			voyageId: voyageId.value,
		} satisfies VoyageApproval;
	});

const stands = (row: StoredRuling) => (row.ruledAt === null ? Effect.succeed(true) : choseApprove(row));

export const approvals = Effect.fn("rulings.approvals")(function* () {
	const db = yield* Database;
	const rows = yield* db.Ruling.where({ kind: "approval", supersededById: null, withdrawnAt: null })
		.orderBy((ruling) => ruling.createdAt.asc())
		.all();
	const standing = yield* Effect.forEach(rows, (row) => Effect.map(stands(row), (kept) => (kept ? [row] : [])));
	return yield* Effect.forEach(standing.flat(), approvalOf);
});
