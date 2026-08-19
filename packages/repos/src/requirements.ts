import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { Context, Effect } from "effect";

const requirements = [Database, DomainFeeds, Writer] as const;

type RequirementRecord = ReadonlyArray<Context.Service.Any>;

type RequirementsOf<Requirements extends RequirementRecord> =
	Context.Service.Identifier<Requirements[number]>;

// why: this is the package-local form of the shared service-definition helper;
// it keeps the declared service keys separate from transitional executor
// requirements until the shared package is available on this base.
type ServiceRequirements<
	Declared extends RequirementRecord,
	Success,
	Failure = never,
	Passthrough = never,
> = Effect.fn.Return<Success, Failure, RequirementsOf<Declared> | Passthrough>;

export type ReposServiceRequirements =
	| RequirementsOf<typeof requirements>
	| WriteExecutors;

export type ReposRequirements<
	Success,
	Failure = never,
	Passthrough = never,
> = ServiceRequirements<
	typeof requirements,
	Success,
	Failure,
	WriteExecutors | Passthrough
>;
