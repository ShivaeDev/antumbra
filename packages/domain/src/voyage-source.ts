import { VoyageSource } from "@antumbra/contract";
import { Effect, Layer } from "effect";
import { AgentDomain } from "#domain.ts";
import { makeVoyageActs } from "#voyage-acts.ts";
import { voyageRefreshes } from "#voyage-feed.ts";
import { makeVoyageReads } from "#voyage-reads.ts";

export const VoyageSourceLive = Layer.effect(VoyageSource)(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const reads = makeVoyageReads(domain);
		const refreshes = voyageRefreshes(domain.feeds);
		return {
			...makeVoyageActs(domain, reads),
			voyage: reads.voyage,
			voyageFeed: (voyageId: string) => refreshes(reads.voyage(voyageId)),
			voyages: reads.voyages,
			voyagesFeed: refreshes(reads.voyages),
		};
	}),
);
