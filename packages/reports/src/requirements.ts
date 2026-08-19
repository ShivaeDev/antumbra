import type { DomainFeeds } from "@antumbra/domain-feeds";
import type { Database, WriteExecutors, Writer } from "@antumbra/persistence";
import type { Context, Effect } from "effect";

export type ReportsRequirements =
	| Context.Service.Identifier<typeof Database>
	| DomainFeeds
	| WriteExecutors
	| Writer;

export type ReportsReturn<A, E> = Effect.fn.Return<A, E, ReportsRequirements>;
