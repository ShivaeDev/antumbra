import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";

export const announce = Effect.fn("CurrentSessions.announce")(function* () {
	const feeds = yield* DomainFeeds;
	yield* feeds.publishFleetRefresh();
	yield* feeds.publishVoyageRefresh();
});
