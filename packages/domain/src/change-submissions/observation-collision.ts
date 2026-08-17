import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { ChangeRow } from "#change-rows.ts";

const copyLink = (
	link: {
		readonly pieceId: string;
		readonly purpose: string;
	},
	toId: string,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const existing = yield* db.PieceChange.where({
			changeId: toId,
			pieceId: link.pieceId,
		}).first();
		if (Option.isSome(existing)) {
			return;
		}
		yield* db.PieceChange.create({
			changeId: toId,
			pieceId: link.pieceId,
			purpose: link.purpose,
		});
	});

const moveLinks = (fromId: string, toId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const links = yield* db.PieceChange.where({ changeId: fromId }).all();
		yield* Effect.forEach(links, (link) => copyLink(link, toId), {
			concurrency: 1,
			discard: true,
		});
		yield* db.PieceChange.where({ changeId: fromId }).deleteAll();
	});

// why: a withdrawn external Change may reopen after its Piece prepared a
// replacement at that exact branch and commit. External identity is the
// canonical history; the prepared row contributes the active claim, local
// snapshot and Piece links, then the duplicate identity disappears atomically.
export const absorbPreparedCollision = (
	external: ChangeRow,
	prepared: ChangeRow,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const proposal =
			prepared.proposalFrozenAt === null
				? {}
				: {
						body: prepared.body,
						proposalFrozenAt: prepared.proposalFrozenAt,
					};
		const merged = {
			...external,
			...proposal,
			openedByAgentId: prepared.openedByAgentId,
			preparedHeadRef: prepared.preparedHeadRef,
			preparedHeadSha: prepared.preparedHeadSha,
			submissionKey: prepared.submissionKey,
			workingDiff: prepared.workingDiff,
			workingTreeStatus: prepared.workingTreeStatus,
			worktreePath: prepared.worktreePath,
		};
		// why: both rows cannot hold one unique active key during the transfer.
		yield* db.Change.where({ id: prepared.id }).update({ submissionKey: null });
		yield* db.Change.where({ id: external.id }).update({
			...proposal,
			openedByAgentId: merged.openedByAgentId,
			preparedHeadRef: merged.preparedHeadRef,
			preparedHeadSha: merged.preparedHeadSha,
			submissionKey: merged.submissionKey,
			workingDiff: merged.workingDiff,
			workingTreeStatus: merged.workingTreeStatus,
			worktreePath: merged.worktreePath,
		});
		yield* moveLinks(prepared.id, external.id);
		yield* db.ChangeTransition.where({ changeId: prepared.id }).deleteAll();
		yield* db.Change.where({ id: prepared.id }).deleteAll();
		return merged;
	});
