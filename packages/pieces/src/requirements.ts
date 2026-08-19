import type { DomainFeeds } from "@antumbra/domain-feeds";
import type { Database, WriteExecutors, Writer } from "@antumbra/persistence";
import type { Context, Effect } from "effect";

export type PiecesRequirements = readonly [
	typeof Database,
	typeof DomainFeeds,
	typeof Writer,
];

export type PiecesReturn<
	Success,
	Failure = never,
	Passthrough = never,
> = Effect.fn.Return<
	Success,
	Failure,
	| Context.Service.Identifier<PiecesRequirements[number]>
	| WriteExecutors
	| Passthrough
>;
