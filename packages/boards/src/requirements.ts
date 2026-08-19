import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import type { Context, Effect } from "effect";

const boardServices = [Database, DomainFeeds, Writer] as const;

type BoardsRequirements<Residual = never> =
	| Context.Service.Identifier<(typeof boardServices)[number]>
	| Residual;

export type BoardsReturn<A, E, Residual = never> = Effect.fn.Return<
	A,
	E,
	BoardsRequirements<Residual>
>;
