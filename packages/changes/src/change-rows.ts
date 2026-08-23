import type {
	ChangeChecks,
	ChangeMergeable,
	ChangeReview,
	ChangeStage,
} from "@antumbra/vocabulary/change";
import {
	type PieceChangePurpose,
	PieceChangePurpose as PieceChangePurposeSchema,
} from "@antumbra/vocabulary/change";
import { Effect, Schema } from "effect";
import { StoredPieceChangeInvalid } from "#errors.ts";

// why: the neutral columns are typed with the shared vocabulary, so a host
// that maps its dialect wrong is a compile error rather than a string nobody
// notices. `draftAt` is a stamped moment like every other flag in this
// schema — null is "not a draft", never "unknown".
export interface ChangeRow {
	readonly activityAt: Date;
	readonly baseRef: string;
	readonly body: string;
	readonly checks: ChangeChecks;
	readonly draftAt: Date | null;
	readonly externalId: string | null;
	readonly headRef: string;
	readonly headSha: string | null;
	readonly host: string;
	readonly id: string;
	readonly landedAt: Date | null;
	readonly mergeable: ChangeMergeable;
	readonly observedAt: Date;
	readonly openedByAgentId: string | null;
	readonly originSessionId: string | null;
	readonly preparedHeadRef: string | null;
	readonly preparedHeadSha: string | null;
	readonly proposalFrozenAt: Date | null;
	readonly raw: string | null;
	readonly repoId: string;
	readonly review: ChangeReview;
	readonly stage: ChangeStage;
	readonly submissionKey: string | null;
	readonly title: string;
	readonly url: string | null;
	readonly withdrawnAt: Date | null;
	readonly workingDiff: string | null;
	readonly workingTreeStatus: string | null;
	readonly worktreePath: string | null;
}

export interface PieceChangeRow {
	readonly changeId: string;
	readonly pieceId: string;
	readonly purpose: PieceChangePurpose;
}

export const pieceChangeRow = (row: {
	readonly changeId: string;
	readonly pieceId: string;
	readonly purpose: string;
}) =>
	Schema.decodeUnknownEffect(PieceChangePurposeSchema)(row.purpose).pipe(
		Effect.mapError(
			(cause) =>
				new StoredPieceChangeInvalid({
					changeId: row.changeId,
					detail: `${String(cause)}; stored purpose ${JSON.stringify(row.purpose)}`,
					pieceId: row.pieceId,
				}),
		),
		Effect.map(
			(purpose): PieceChangeRow => ({
				changeId: row.changeId,
				pieceId: row.pieceId,
				purpose,
			}),
		),
	);

export type { PieceChangePurpose };
