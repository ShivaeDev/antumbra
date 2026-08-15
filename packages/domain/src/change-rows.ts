import type {
	ChangeChecks,
	ChangeMergeable,
	ChangeReview,
	ChangeStage,
} from "@antumbra/plugin-api";

// why: the neutral columns are typed with the port's own unions, so a host
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
	readonly raw: string | null;
	readonly repoId: string;
	readonly review: ChangeReview;
	readonly stage: ChangeStage;
	readonly title: string;
	readonly url: string | null;
	readonly withdrawnAt: Date | null;
}

export interface PieceChangeRow {
	readonly changeId: string;
	readonly pieceId: string;
}
