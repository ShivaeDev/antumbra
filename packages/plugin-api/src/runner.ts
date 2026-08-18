import { Data, type Effect } from "effect";

export interface RunnerCapabilities {
	readonly liveTerminal: boolean;
}

export class RunnerFailure extends Data.TaggedError("RunnerFailure")<{
	readonly detail: string;
	readonly tag: string;
}> {
	override get message(): string {
		return `${this.tag}: ${this.detail}`;
	}
}

export class RunnerProvisionConflict extends Data.TaggedError(
	"RunnerProvisionConflict",
)<{
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

export type RunnerError =
	| RunnerAuthRequired
	| RunnerFailure
	| RunnerProvisionConflict;

export interface RepoRequest {
	readonly ref: string;
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

// why: the root is the agent's cwd and doubles as its scratchpad — it exists
// even when no repos were requested.
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

export type ReclaimVerdict =
	| { readonly _tag: "dirty" }
	| { readonly _tag: "reclaimed" };

export interface Runner {
	readonly captureChange: (
		berth: BerthSite,
	) => Effect.Effect<ChangePreparationEvidence, RunnerError>;
	readonly capabilities: RunnerCapabilities;
	readonly plan: (request: ProvisionRequest) => MooragePlan;
	readonly provision: (plan: MooragePlan) => Effect.Effect<void, RunnerError>;
	// why: reclaim refuses dirty berths by design; scrap is a destructive
	// primitive and automatic recovery must never call it.
	readonly reclaim: (
		berth: BerthSite,
	) => Effect.Effect<ReclaimVerdict, RunnerError>;
	readonly scrap: (berth: BerthSite) => Effect.Effect<void, RunnerError>;
	readonly tag: string;
}
