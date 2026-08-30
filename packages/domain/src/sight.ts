import { Changes } from "@antumbra/changes";
import { SightSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect, Layer, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { makeSightActs } from "#sight-acts.ts";
import { toFailure } from "#sight-failure.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
import { pendingIntents } from "#sight-intents.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { makeSightSessionTree } from "#sight-session-tree.ts";

export const SightSourceLive = Layer.effect(SightSource)(
	Effect.gen(function* () {
		const changes = yield* Changes;
		const domain = yield* AgentDomain;
		const feeds = yield* DomainFeeds;
		const kernel = yield* Kernel;
		const db = yield* Database;
		const acts = yield* makeSightActs;
		const events = yield* makeSightSessionEvents;
		const tree = yield* makeSightSessionTree;

		// why: the attachments and what they are carrying are read in the same pass
		// as the rows, so one snapshot never mixes what the record said a moment
		// ago with what this process is holding now.
		const fleet = pendingIntents.pipe(
			Effect.provideService(AgentDomain, domain),
			Effect.provideService(Kernel, kernel),
			Effect.flatMap((intents) =>
				Effect.flatMap(
					Effect.all({
						attached: domain.sessionsAttached,
						capacities: domain.backendCapacities.snapshot,
						delegating: domain.sessionsDelegating,
					}),
					(runtime) => fleetSnapshot(domain.backends, domain.imageInputBackends, intents, runtime.capacities, runtime),
				),
			),
			Effect.provideService(Changes, changes),
			Effect.provideService(Database, db),
			Effect.mapError(toFailure),
		);

		const fleetFeed = Stream.unwrap(
			Effect.gen(function* () {
				const subscription = yield* feeds.subscribeFleetRefresh();
				const refresh = Stream.fromSubscription(subscription).pipe(Stream.mapEffect(() => fleet));
				return Stream.fromEffect(fleet).pipe(Stream.concat(refresh));
			}),
		);

		return { ...acts, ...events, ...tree, fleet, fleetFeed };
	}),
);
