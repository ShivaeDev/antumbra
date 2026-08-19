import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import { adoptSubmittedChange } from "#change-submissions/adopt.ts";
import { readHeldResources } from "#change-submissions/held-resources.ts";
import { applyObservations } from "#change-submissions/observations.ts";
import { openSubmittedChange } from "#change-submissions/open.ts";
import { prepareChange } from "#change-submissions/prepare.ts";
import {
	refreshSubmittedChanges,
	watchableChanges,
} from "#change-submissions/refresh.ts";
import {
	ChangeHostRegistry,
	ChangeRegistriesLive,
	RunnerRegistry,
} from "#change-submissions/registries.ts";
import { Changes } from "#change-submissions/service.ts";
import { readChangeSnapshot } from "#snapshot.ts";

export const ChangesLive = (
	hosts: ReadonlyMap<string, ChangeHost>,
	runners: ReadonlyMap<string, Runner>,
) =>
	Layer.effect(Changes)(
		Effect.gen(function* () {
			const changeHostRegistry = yield* ChangeHostRegistry;
			const db = yield* Database;
			const feeds = yield* DomainFeeds;
			const pieces = yield* Pieces;
			const runnerRegistry = yield* RunnerRegistry;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const context = Context.merge(
				executors,
				Context.make(Database, db).pipe(
					Context.add(ChangeHostRegistry, changeHostRegistry),
					Context.add(DomainFeeds, feeds),
					Context.add(Pieces, pieces),
					Context.add(RunnerRegistry, runnerRegistry),
					Context.add(Writer, writer),
				),
			);
			return Changes.of({
				adopt: (input) => Effect.provide(adoptSubmittedChange(input), context),
				heldResources: (resources) =>
					Effect.provideService(readHeldResources(resources), Database, db),
				observed: (hostTag, observations) =>
					Effect.provide(applyObservations(hostTag, observations), context),
				open: (input) => Effect.provide(openSubmittedChange(input), context),
				refresh: (hostTag) =>
					Effect.provide(refreshSubmittedChanges(hostTag), context),
				snapshot: Effect.provide(readChangeSnapshot, context),
				submit: (input) =>
					Effect.provide(
						Effect.map(prepareChange(input), ({ row }) => row),
						context,
					),
				watchable: (hostTag) =>
					Effect.provide(watchableChanges(hostTag), context),
			});
		}),
	).pipe(Layer.provide(ChangeRegistriesLive(hosts, runners)));
