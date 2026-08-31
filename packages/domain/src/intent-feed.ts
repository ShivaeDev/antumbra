import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Effect, Layer, Stream } from "effect";

export const IntentFeedLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const kernel = yield* Kernel;
		yield* Effect.forkScoped(kernel.transitions.pipe(Stream.runForEach(() => feeds.publishFleetRefresh())));
	}),
);
