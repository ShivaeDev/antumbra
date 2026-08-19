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
import { readChangeSnapshot } from "#snapshot.ts";

type ProvidedOperation<
	Operation,
	Success = Operation extends (...inputs: infer _Inputs) => infer Program
		? Program extends Effect.Effect<infer Value, unknown, unknown>
			? Value
			: never
		: never,
	Requirements = never,
> = Operation extends (...inputs: infer Inputs) => infer Program
	? Program extends Effect.Effect<unknown, infer Failure, unknown>
		? (...inputs: Inputs) => Effect.Effect<Success, Failure, Requirements>
		: never
	: never;

type ReadonlyArraySuccess<Operation> = Operation extends (
	...inputs: infer _Inputs
) => Effect.Effect<ReadonlyArray<infer Value>, unknown, unknown>
	? ReadonlyArray<Value>
	: never;

type ReadonlyMapSuccess<Operation> = Operation extends (
	...inputs: infer _Inputs
) => Effect.Effect<ReadonlyMap<infer Key, infer Value>, unknown, unknown>
	? ReadonlyMap<Key, Value>
	: never;

interface ChangesService {
	readonly adopt: ProvidedOperation<typeof adoptSubmittedChange>;
	readonly heldResources: ProvidedOperation<
		typeof readHeldResources,
		ReadonlyMapSuccess<typeof readHeldResources>,
		WriteExecutors
	>;
	readonly observed: (
		hostTag: Parameters<typeof applyObservations>[0],
		observations: Parameters<typeof applyObservations>[1],
	) => Effect.Effect<
		ReadonlyArraySuccess<typeof applyObservations>,
		Effect.Error<ReturnType<typeof applyObservations>>
	>;
	readonly open: ProvidedOperation<typeof openSubmittedChange>;
	readonly refresh: ProvidedOperation<
		typeof refreshSubmittedChanges,
		ReadonlyArraySuccess<typeof refreshSubmittedChanges>
	>;
	readonly snapshot: Effect.Effect<
		Effect.Success<typeof readChangeSnapshot>,
		Effect.Error<typeof readChangeSnapshot>
	>;
	readonly submit: (
		input: Parameters<typeof prepareChange>[0],
	) => Effect.Effect<
		Effect.Success<ReturnType<typeof prepareChange>>["row"],
		Effect.Error<ReturnType<typeof prepareChange>>
	>;
	readonly watchable: ProvidedOperation<
		typeof watchableChanges,
		ReadonlyArraySuccess<typeof watchableChanges>
	>;
}

const changesService = Effect.gen(function* () {
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
	return {
		adopt: (input: Parameters<typeof adoptSubmittedChange>[0]) =>
			Effect.provide(adoptSubmittedChange(input), context),
		heldResources: (resources: Parameters<typeof readHeldResources>[0]) =>
			Effect.provideService(readHeldResources(resources), Database, db),
		observed: (
			hostTag: Parameters<typeof applyObservations>[0],
			observations: Parameters<typeof applyObservations>[1],
		) => Effect.provide(applyObservations(hostTag, observations), context),
		open: (input: Parameters<typeof openSubmittedChange>[0]) =>
			Effect.provide(openSubmittedChange(input), context),
		refresh: (hostTag: Parameters<typeof refreshSubmittedChanges>[0]) =>
			Effect.provide(refreshSubmittedChanges(hostTag), context),
		snapshot: Effect.provide(readChangeSnapshot, context),
		submit: (input: Parameters<typeof prepareChange>[0]) =>
			Effect.provide(
				Effect.map(prepareChange(input), ({ row }) => row),
				context,
			),
		watchable: (hostTag: Parameters<typeof watchableChanges>[0]) =>
			Effect.provide(watchableChanges(hostTag), context),
	} satisfies ChangesService;
});

export class Changes extends Context.Service<Changes, ChangesService>()(
	"@antumbra/changes/Changes",
) {}

export const ChangesLive = (
	hosts: ReadonlyMap<string, ChangeHost>,
	runners: ReadonlyMap<string, Runner>,
): Layer.Layer<
	Changes,
	never,
	| Context.Service.Identifier<typeof Database>
	| DomainFeeds
	| Pieces
	| WriteExecutors
	| Writer
> =>
	Layer.effect(Changes)(changesService).pipe(
		Layer.provide(ChangeRegistriesLive(hosts, runners)),
	);
