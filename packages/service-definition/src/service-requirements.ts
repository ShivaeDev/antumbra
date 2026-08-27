import type { Context, Effect, Scope } from "effect";

export type RequirementRecord = ReadonlyArray<Context.Service.Any>;

export type RequirementsOf<Requirements extends RequirementRecord> =
	Context.Service.Identifier<Requirements[number]>;

export type ServiceRequirements<
	Requirements extends RequirementRecord,
	Success,
	Failure = never,
	CallerScope extends Scope.Scope = never,
> = Effect.fn.Return<
	Success,
	Failure,
	RequirementsOf<Requirements> | CallerScope
>;
