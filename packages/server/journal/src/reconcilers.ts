import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeaturePorts, FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { type PortShape, portRecord } from "@antumbra/platform-feature/port.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { ReconcilerShape } from "@antumbra/platform-feature/reconciler.ts";
import { Effect, type Scope } from "effect";
import { Commit, type CommitService } from "#commit.ts";
import { Live, type LiveService } from "#live.ts";
import { type Due, each, type Reconciler, run } from "#reconcile.ts";

interface LooseCommit {
	readonly commit: (command: CommandShape, input: Record<string, unknown>) => Effect.Effect<number, unknown>;
}

interface LooseLive {
	readonly read: (query: QueryShape, input: Record<string, unknown>) => Effect.Effect<unknown>;
}

interface LooseHelpers {
	readonly run: (
		query: QueryShape,
		input: Record<string, unknown>,
		act: (reading: unknown) => Effect.Effect<void>,
		due: Due<unknown> | undefined,
	) => Effect.Effect<Reconciler, never, Live | Scope.Scope>;
	readonly each: (
		query: QueryShape,
		input: Record<string, unknown>,
		keyOf: (row: unknown) => unknown,
		act: (row: unknown) => Effect.Effect<void>,
	) => Effect.Effect<Reconciler, never, Live | Scope.Scope>;
}

interface Declared {
	readonly due: Due<unknown> | undefined;
	readonly each: ((row: unknown) => unknown) | undefined;
	readonly input: Record<string, unknown>;
	readonly name: string;
	readonly ports: readonly PortShape[];
	readonly run: (reading: unknown, reconciling: unknown) => Effect.Effect<void, unknown>;
	readonly watch: QueryShape;
}

function looseCommit(service: CommitService): LooseCommit;
function looseCommit(service: unknown): unknown {
	return service;
}

function looseLive(service: LiveService): LooseLive;
function looseLive(service: unknown): unknown {
	return service;
}

function looseHelpers(helpers: { readonly each: typeof each; readonly run: typeof run }): LooseHelpers;
function looseHelpers(helpers: unknown): unknown {
	return helpers;
}

function declaredBy(reconciler: ReconcilerShape): Declared;
function declaredBy(reconciler: unknown): unknown {
	return reconciler;
}

const helpers = looseHelpers({ each, run });

const built = Effect.fn("Reconcilers.build")(function* (live: LooseLive, commit: LooseCommit, declared: Declared) {
	const ports = yield* portRecord(declared.ports);
	const reconciling = {
		commit: (command: CommandShape, input: Record<string, unknown>) => commit.commit(command, input),
		ports,
		read: (query: QueryShape, input: Record<string, unknown>) => live.read(query, input),
	};
	const act = (reading: unknown) =>
		Effect.catch(declared.run(reading, reconciling), (failure) => Effect.logError("a reconciler run failed", { failure, reconciler: declared.name }));
	return declared.each === undefined
		? yield* helpers.run(declared.watch, declared.input, act, declared.due)
		: yield* helpers.each(declared.watch, declared.input, declared.each, act);
});

const combined = (all: readonly Reconciler[]): Reconciler => ({
	await: all.length === 0 ? Effect.never : Effect.raceAllFirst(all.map((reconciler) => reconciler.await)),
	refresh: Effect.forEach(all, (reconciler) => reconciler.refresh, { discard: true }),
});

export function reconcilers<const Features extends readonly FeatureShape[]>(
	features: Features,
): Effect.Effect<Reconciler, never, Commit | FeaturePorts<Features> | Live | Scope.Scope>;
export function reconcilers(features: readonly FeatureShape[]): unknown {
	return Effect.gen(function* () {
		const commit = looseCommit(yield* Commit);
		const live = looseLive(yield* Live);
		const all: Reconciler[] = [];
		for (const feature of features) {
			for (const declared of feature.reconcilers) all.push(yield* built(live, commit, declaredBy(declared)));
		}
		return combined(all);
	});
}
