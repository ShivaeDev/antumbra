import { CostSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Layer, Stream } from "effect";
import { makeCostsRead } from "#costs/read.ts";
import { toFailure } from "#sight-failure.ts";

export const CostSourceLive = Layer.effect(CostSource)(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const read = yield* makeCostsRead;
		const costs = read().pipe(Effect.mapError(toFailure));
		const costsFeed = Stream.unwrap(
			Effect.gen(function* () {
				const events = yield* feeds.subscribeSessionEvents();
				const spent = Stream.fromSubscription(events).pipe(
					Stream.filter((event) => event.kind === "usage"),
					Stream.mapEffect(() => costs),
				);
				return Stream.fromEffect(costs).pipe(Stream.concat(spent));
			}),
		);
		return { costsFeed };
	}),
);
