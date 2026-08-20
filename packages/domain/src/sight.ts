import { SightSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect, Layer, PubSub, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { makeSightActs } from "#sight-acts.ts";
import { writeProvider } from "#sight-executors.ts";
import { toFailure } from "#sight-failure.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
import { pendingIntents } from "#sight-intents.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";

export const SightSourceLive = Layer.effect(SightSource)(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const feeds = yield* DomainFeeds;
		const kernel = yield* Kernel;
		const db = yield* Database;
		const provide = yield* writeProvider;
		const acts = yield* makeSightActs;
		const events = yield* makeSightSessionEvents;

		const fleet = pendingIntents.pipe(
			Effect.provideService(AgentDomain, domain),
			Effect.provideService(Kernel, kernel),
			Effect.flatMap((intents) => fleetSnapshot(domain.backends, intents)),
			Effect.provideService(Database, db),
			provide,
			Effect.mapError(toFailure),
		);

		const fleetFeed = Stream.unwrap(
			Effect.gen(function* () {
				const subscription = yield* PubSub.subscribe(feeds.fleet);
				const refresh = Stream.fromSubscription(subscription).pipe(
					Stream.mapEffect(() => fleet),
				);
				return Stream.fromEffect(fleet).pipe(Stream.concat(refresh));
			}),
		);

		return { ...acts, ...events, fleet, fleetFeed };
	}),
);
