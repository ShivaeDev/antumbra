import type { DomainFeeds } from "@antumbra/domain-feeds";
import type { Database, WriteExecutors, Writer } from "@antumbra/persistence";
import type { Context, Effect } from "effect";

type Requirements = readonly [
	typeof Database,
	typeof DomainFeeds,
	typeof Writer,
];

export type SessionEventJournalRequirements =
	| Context.Service.Identifier<Requirements[number]>
	| WriteExecutors;

export type SessionEventJournalReturn<
	Success,
	Failure = never,
	Passthrough = never,
> = Effect.fn.Return<
	Success,
	Failure,
	SessionEventJournalRequirements | Passthrough
>;
