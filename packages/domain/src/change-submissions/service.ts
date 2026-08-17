import { DomainFeeds } from "@antumbra/domain-feeds";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import type {
	ChangeHost,
	ChangeHostError,
	ChangeObservation,
	Runner,
} from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import type {
	OpenChangeFailure,
	OpenChangeInput,
	SubmitChangeFailure,
	SubmitChangeInput,
} from "#change-submissions/model.ts";
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
import type { UnknownChangeHostTag } from "#errors.ts";

export class ChangeSubmissions extends Context.Service<
	ChangeSubmissions,
	{
		readonly observed: (
			hostTag: string,
			observations: ReadonlyArray<ChangeObservation>,
		) => Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError>;
		readonly open: (
			input: OpenChangeInput,
		) => Effect.Effect<ChangeRow, OpenChangeFailure>;
		readonly refresh: (
			hostTag: string,
		) => Effect.Effect<
			ReadonlyArray<ChangeRow>,
			ChangeHostError | PrismaError | UnknownChangeHostTag
		>;
		readonly submit: (
			input: SubmitChangeInput,
		) => Effect.Effect<ChangeRow, SubmitChangeFailure>;
		readonly watchable: (
			hostTag: string,
		) => Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError>;
	}
>()("@antumbra/domain/ChangeSubmissions") {}

export const ChangeSubmissionsLive = (
	hosts: ReadonlyMap<string, ChangeHost>,
	runners: ReadonlyMap<string, Runner>,
) =>
	Layer.effect(ChangeSubmissions)(
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
			return ChangeSubmissions.of({
				observed: (hostTag, observations) =>
					Effect.provide(applyObservations(hostTag, observations), context),
				open: (input) => Effect.provide(openSubmittedChange(input), context),
				refresh: (hostTag) =>
					Effect.provide(refreshSubmittedChanges(hostTag), context),
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
