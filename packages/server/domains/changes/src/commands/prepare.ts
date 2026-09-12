import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { claimed, claimRows, ownerAvailable } from "#claims.ts";
import { changePrepared } from "#facts/change-prepared.ts";
import { ChangeId, pieceChangeId } from "#ids.ts";
import { type ChangeRow, change } from "#rows/change.ts";
export const submissionKey = (agentId: string, repoId: string): string => JSON.stringify([agentId, repoId]);
export const prepare = command("prepare", {
	input: {
		pieceId: PieceId,
		repoId: RepoId,
		agentId: Schema.String,
		sessionId: Schema.String,
		host: Schema.String,
		branch: Schema.String,
		headSha: Schema.String,
		workingDiff: Schema.String,
		workingTreeStatus: Schema.String,
		worktreePath: Schema.String,
		capturedAt: Schema.String,
	},
	reads: [piece, repo, change, ...claimRows],
	emits: changePrepared,
	rejections: {
		ResourceOwnerUnavailable: { agentId: Schema.String },
		UnknownPiece: { id: Schema.String },
		UnknownRepo: { id: Schema.String },
		ResourceClaimed: { agentId: Schema.String },
	},
	run: Effect.fn("changes.prepare")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.pieceId))) return yield* reject.UnknownPiece({ id: input.pieceId });
		if (!(yield* rows.repo.exists(input.repoId))) return yield* reject.UnknownRepo({ id: input.repoId });
		if (!(yield* ownerAvailable(rows, input.agentId))) return yield* reject.ResourceOwnerUnavailable({ agentId: input.agentId });
		const repository = yield* rows.repo.get(input.repoId);
		if (yield* claimed(rows, input.agentId, repository.source, input.branch)) return yield* reject.ResourceClaimed({ agentId: input.agentId });
		const key = submissionKey(input.agentId, input.repoId);
		const existing = (yield* rows.change.where({ submissionKey: key }))[0];
		const held: ChangeRow = existing ?? {
			id: ChangeId.make(input.requestId),
			repoId: input.repoId,
			host: input.host,
			title: "",
			body: "",
			headRef: input.branch,
			baseRef: repository.defaultRef,
			headSha: input.headSha,
			preparedHeadRef: input.branch,
			preparedHeadSha: input.headSha,
			proposalFrozenAt: null,
			worktreePath: input.worktreePath,
			workingDiff: input.workingDiff,
			workingTreeStatus: input.workingTreeStatus,
			submissionKey: key,
			stage: "prepared",
			draftAt: null,
			url: null,
			externalId: null,
			checks: "none",
			review: "none",
			mergeable: "unknown",
			openedByAgentId: input.agentId,
			originSessionId: input.sessionId,
			raw: null,
			activityAt: input.capturedAt,
			observedAt: input.capturedAt,
			landedAt: null,
			withdrawnAt: null,
			createdAt: input.capturedAt,
		};
		return { change: held, link: { id: pieceChangeId(input.pieceId, held.id), pieceId: input.pieceId, changeId: held.id, purpose: "produces" } };
	}),
});
