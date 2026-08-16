import { type AdoptChangeRequest, VoyageSource } from "@antumbra/contract";
import { Effect, Layer } from "effect";
import { changeView } from "#change-view.ts";
import { AgentDomain } from "#domain.ts";
import { quaySeen } from "#quay-projection.ts";
import { toFailure } from "#sight-failure.ts";
import { makeVoyageActs } from "#voyage-acts.ts";
import { makeVoyageRefreshes } from "#voyage-feed.ts";
import { changeSeen } from "#voyage-projection.ts";
import { makeVoyageReads } from "#voyage-reads.ts";

export const VoyageSourceLive = Layer.effect(VoyageSource)(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const reads = makeVoyageReads(domain);
		const refreshes = yield* makeVoyageRefreshes;
		const quay = Effect.gen(function* () {
			const reading = yield* domain.changes.quay;
			return quaySeen(reading, yield* domain.changes.capabilities);
		}).pipe(Effect.mapError(toFailure));
		return {
			...makeVoyageActs(domain, reads),
			// why: a change made by hand was opened by nobody this system spawned,
			// so it is adopted with no agent behind it — the act of the person at
			// the window, recorded as such rather than credited to the crew.
			adoptChange: (request: AdoptChangeRequest) =>
				domain.changes.adopt({ agentId: null, ...request }).pipe(
					Effect.map((row) => changeSeen(changeView(request.repoName, row))),
					Effect.mapError(toFailure),
				),
			quay,
			quayFeed: refreshes(quay),
			refreshChanges: domain.changes.requestRefresh,
			voyage: reads.voyage,
			voyageFeed: (voyageId: string) => refreshes(reads.voyage(voyageId)),
			voyages: reads.voyages,
			voyagesFeed: refreshes(reads.voyages),
		};
	}),
);
