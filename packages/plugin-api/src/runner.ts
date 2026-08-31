import { Data, type Effect } from "effect";

export class RunnerFailure extends Data.TaggedError("RunnerFailure")<{
	readonly detail: string;
	readonly tag: string;
}> {
	override get message(): string {
		return `${this.tag}: ${this.detail}`;
	}
}

export class RunnerProvisionConflict extends Data.TaggedError("RunnerProvisionConflict")<{
	readonly detail: string;
	readonly tag: string;
}> {
	override get message(): string {
		return `${this.tag}: provision conflict: ${this.detail}`;
	}
}

export class RunnerAuthRequired extends Data.TaggedError("RunnerAuthRequired")<{
	readonly detail: string;
	readonly tag: string;
}> {
	override get message(): string {
		return `${this.tag}: authentication required: ${this.detail}`;
	}
}

export class UnknownRunnerError extends Data.TaggedError("UnknownRunnerError")<{
	readonly tag: string;
}> {}

export type RunnerError = RunnerAuthRequired | RunnerFailure | RunnerProvisionConflict;

export interface RepoRequest {
	readonly ref: string;
	readonly slug: string;
	readonly source: string;
}

export interface ProvisionRequest {
	readonly agentId: string;
	readonly repos: ReadonlyArray<RepoRequest>;
}

export interface BerthPlan {
	readonly branch: string;
	readonly path: string;
	readonly ref: string;
	readonly slug: string;
	readonly source: string;
}

export interface MooragePlan {
	readonly berths: ReadonlyArray<BerthPlan>;
	readonly root: string;
}

export interface BerthSite {
	readonly branch: string;
	readonly path: string;
	readonly slug: string;
	readonly source: string;
}

export interface ChangePreparationEvidence {
	readonly branch: string;
	readonly headSha: string;
	readonly workingDiff: string;
	readonly workingTreeStatus: string;
	readonly worktreePath: string;
}

export type ReclaimVerdict = { readonly _tag: "dirty" } | { readonly _tag: "reclaimed" };

export interface Runner {
	readonly captureChange: (berth: BerthSite) => Effect.Effect<ChangePreparationEvidence, RunnerError>;
	readonly plan: (request: ProvisionRequest) => MooragePlan;
	readonly provision: (plan: MooragePlan) => Effect.Effect<void, RunnerError>;
	readonly reclaim: (berth: BerthSite) => Effect.Effect<ReclaimVerdict, RunnerError>;
	// Automatic recovery must never call this destructive operation.
	readonly scrap: (berth: BerthSite) => Effect.Effect<void, RunnerError>;
	readonly tag: string;
}
