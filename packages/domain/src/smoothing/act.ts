import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { toFailure } from "#sight-failure.ts";

export const makeSmoothBoard = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const feeds = yield* DomainFeeds;
	const kernel = yield* Kernel;
	const voyages = yield* Voyages;
	return Effect.fn("Voyages.smoothBoard")((voyageId: string) =>
		voyages
			.verifyExists(voyageId)
			.pipe(Effect.andThen(kernel.submit(domain.smooth, { voyageId })), Effect.andThen(feeds.publishVoyageRefresh()), Effect.mapError(toFailure)),
	);
});
