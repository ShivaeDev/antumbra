import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";

export const announceCapacity = Effect.fn("BackendCapacities.announce")(function* () {
	const feeds = yield* DomainFeeds;
	yield* feeds.publishFleetRefresh();
});
