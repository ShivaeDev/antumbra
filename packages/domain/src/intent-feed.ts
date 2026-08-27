import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Effect, Layer, Stream } from "effect";

// why: an Intent's whole life is invisible in the fleet's rows — a recover
// parked in waiting changes no Agent and no Session — so nothing rang the feed
// when one moved, and the diagnostics beside the fleet only ever refreshed on
// whatever unrelated write happened next. The kernel already fans every move
// out for observers; this is the one reader that turns that into a reason to
// look at the fleet again. It rings and never reads: what a change means is
// still decided by whoever reads the snapshot afterwards.
export const IntentFeedLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const kernel = yield* Kernel;
		yield* Effect.forkScoped(
			kernel.transitions.pipe(
				Stream.runForEach(() => feeds.publishFleetRefresh()),
			),
		);
	}),
);
