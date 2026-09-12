import type { Berth, ChangeEvidence, Moorage, Repo } from "@antumbra/platform-vocabulary/resources.ts";
import { Data } from "effect";

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

export type RunnerError = RunnerAuthRequired | RunnerFailure | RunnerProvisionConflict;
export type RepoRequest = typeof Repo.Type;
export interface ProvisionRequest {
	readonly agentId: string;
	readonly repos: ReadonlyArray<RepoRequest>;
}
export type BerthPlan = Berth;
export type BerthSite = Pick<Berth, "branch" | "path" | "slug" | "source">;
export type MooragePlan = Moorage;
export type ChangePreparationEvidence = ChangeEvidence;
export type ReclaimVerdict = { readonly _tag: "dirty" } | { readonly _tag: "reclaimed" };
