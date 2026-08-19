import type { Context, Effect } from "effect";

export type RequirementRecord = ReadonlyArray<Context.Service.Any>;

export type RequirementsOf<Requirements extends RequirementRecord> =
	Context.Service.Identifier<Requirements[number]>;

export type ServiceRequirements<
	Requirements extends RequirementRecord,
	Success,
	Failure = never,
	Passthrough = never,
> = Effect.fn.Return<
	Success,
	Failure,
	RequirementsOf<Requirements> | Passthrough
>;
