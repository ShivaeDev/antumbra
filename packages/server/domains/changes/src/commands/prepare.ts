import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Schema } from "effect";
import { claimRows } from "#commands/claims.ts";
import { changePrepared } from "#facts/change-prepared.ts";
import { change } from "#rows/change.ts";
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
});
