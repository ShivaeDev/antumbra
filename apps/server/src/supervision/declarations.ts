import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeaturePorts, FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { type PortShape, portRecord } from "@antumbra/platform-feature/port.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { ReconcilerShape } from "@antumbra/platform-feature/reconciler.ts";
import { Commit, type CommitService } from "@antumbra/server-journal/commit.ts";
import { Live, type LiveService } from "@antumbra/server-journal/live.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import type { Due } from "@shivaedev/reconciler/Reconciler.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Clock, Effect, Schema } from "effect";
import type { Reactivity } from "effect/reactivity/Reactivity";
import { watchKeys } from "#supervision/keys.ts";
import type { Loop } from "#supervision/loop.ts";

interface LooseCommit {
	readonly commit: (command: CommandShape, input: Record<string, unknown>) => Effect.Effect<number, unknown>;
}

interface LooseLive {
	readonly read: (query: QueryShape, input: Record<string, unknown>) => Effect.Effect<unknown>;
}

interface Declared {
	readonly due: Due<unknown> | undefined;
	readonly each: ((row: unknown) => unknown) | undefined;
	readonly input: Record<string, unknown>;
	readonly name: string;
	readonly ports: readonly PortShape[];
	readonly run: (reading: unknown, reconciling: unknown) => Effect.Effect<void, unknown>;
	readonly watch: QueryShape & { readonly scope: ((input: Record<string, unknown>) => string) | undefined };
}

function looseCommit(service: CommitService): LooseCommit;
function looseCommit(service: unknown): unknown {
	return service;
}

function looseLive(service: LiveService): LooseLive;
function looseLive(service: unknown): unknown {
	return service;
}

function declaredBy(reconciler: ReconcilerShape): Declared;
function declaredBy(reconciler: unknown): unknown {
	return reconciler;
}

const built = Effect.fn("Reconcilers.build")(function* (declared: Declared) {
	const commit = looseCommit(yield* Commit);
	const live = looseLive(yield* Live);
	const ports = yield* portRecord(declared.ports);
	const reconciling = {
		commit: (command: CommandShape, input: Record<string, unknown>) => commit.commit(command, input),
		ports,
		read: (query: QueryShape, input: Record<string, unknown>) => live.read(query, input),
	};
	let retryAt: number | undefined;
	const noted = (failure: unknown) =>
		Effect.gen(function* () {
			retryAt = (yield* Clock.currentTimeMillis) + 60_000;
			yield* Effect.logError("a reconciler run failed", { failure, reconciler: declared.name });
		});
	const keys = watchKeys(declared.watch.reads, declared.watch.scope?.(declared.input));
	const read = live.read(declared.watch, declared.input);
	const due: Due<unknown> = (reading, now) => {
		const reported = declared.due?.(reading, now);
		if (retryAt === undefined) return reported;
		return reported === undefined || reported <= now ? retryAt : Math.min(reported, retryAt);
	};
	const act = (reading: unknown) => declared.run(reading, reconciling);
	return declared.each === undefined
		? yield* run({
				keys,
				read,
				act: (reading) => {
					retryAt = undefined;
					return Effect.catch(act(reading), noted);
				},
				due,
			})
		: yield* each({
				keys,
				read: Effect.flatMap(read, Schema.decodeUnknownEffect(Schema.Array(Schema.Unknown))).pipe(Effect.orDie),
				key: declared.each,
				act: (row) => Effect.catch(act(row), noted),
			});
});

export function reconcilers<const Features extends readonly FeatureShape[]>(
	features: Features,
): readonly Loop<Commit | FeaturePorts<Features> | Live | Reactivity>[];
export function reconcilers(features: readonly FeatureShape[]): unknown {
	const loops: { readonly name: string; readonly open: unknown }[] = [];
	for (const feature of features) {
		for (const declared of feature.reconcilers) loops.push({ name: declared.name, open: built(declaredBy(declared)) });
	}
	return loops;
}
