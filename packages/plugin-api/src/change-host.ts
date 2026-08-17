import type {
	ChangeChecks,
	ChangeMergeable,
	ChangeReview,
	ChangeStage,
} from "@antumbra/change-vocabulary";
import { Data, type Effect } from "effect";

export interface ChangeHostRepo {
	readonly defaultRef: string;
	readonly id: string;
	readonly name: string;
	readonly source: string;
}

export interface ChangeHostBerth {
	readonly branch: string;
	readonly path: string;
}

export interface OpenChangeRequest {
	// why: a null base means the repo's own default ref — the caller states
	// which branch it wants only when it wants something other than the trunk.
	readonly base: string | null;
	readonly berth: ChangeHostBerth;
	readonly body: string;
	readonly draft: boolean;
	readonly headSha: string;
	readonly repo: ChangeHostRepo;
	// why: this is the immutable prepared Change id. Repeating open for the same
	// host, repo id, and submission id must return the accepted observation, or
	// fail without attempting another external create when acceptance is unknown.
	readonly submissionId: string;
	readonly title: string;
}

export interface ChangeRef {
	readonly externalId: string;
	readonly repo: ChangeHostRepo;
}

// why: the host speaks its own dialect (numbers, merge-state statuses, review
// decisions); the domain keeps one neutral vocabulary and stores the raw
// payload beside it, so a second host maps onto the same columns and no
// consumer ever learns which host it is reading.
export interface ChangeObservation {
	readonly activityAt: number;
	readonly baseRef: string;
	readonly checks: ChangeChecks;
	readonly externalId: string;
	readonly headRef: string;
	readonly headSha: string | null;
	readonly isDraft: boolean;
	readonly mergeable: ChangeMergeable;
	readonly raw: unknown;
	readonly repoId: string;
	readonly review: ChangeReview;
	readonly stage: Exclude<ChangeStage, "prepared">;
	readonly title: string;
	readonly url: string;
}

export interface ChangeHostCapability {
	readonly available: boolean;
	readonly detail: string;
}

export class ChangeHostUnavailable extends Data.TaggedError(
	"ChangeHostUnavailable",
)<{
	readonly detail: string;
	readonly host: string;
}> {
	override get message(): string {
		return `${this.host} is unavailable: ${this.detail}`;
	}
}

export class ChangeHostRefused extends Data.TaggedError("ChangeHostRefused")<{
	readonly detail: string;
	readonly host: string;
}> {
	override get message(): string {
		return `${this.host} refused: ${this.detail}`;
	}
}

export type ChangeHostError = ChangeHostRefused | ChangeHostUnavailable;

export interface ChangeHost {
	readonly adopt: (
		url: string,
		repo: ChangeHostRepo,
	) => Effect.Effect<ChangeObservation, ChangeHostError>;
	readonly capability: Effect.Effect<ChangeHostCapability>;
	readonly observe: (
		refs: ReadonlyArray<ChangeRef>,
	) => Effect.Effect<ReadonlyArray<ChangeObservation>, ChangeHostError>;
	readonly open: (
		request: OpenChangeRequest,
	) => Effect.Effect<ChangeObservation, ChangeHostError>;
	readonly supports: (repo: ChangeHostRepo) => boolean;
	readonly tag: string;
}
