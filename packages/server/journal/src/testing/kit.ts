import type { FeatureShape, Fields, QueryDefinition, RowShape, Values } from "@antumbra/feature";
import { Duration, Effect, type Schema, Scope, Stream } from "effect";
import * as TestClock from "effect/testing/TestClock";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { type AppDefinition, codecOf, type Registry, registryOf } from "#app.ts";
import { Commit } from "#commit.ts";
import { Database } from "#database.ts";
import { keysOf, Live, type LiveService } from "#live.ts";
import { readHandle } from "#read-handle.ts";
import { commitsOf } from "#testing/commits.ts";
import type { Emissions, TestApp } from "#testing/surface.ts";
import { type Watch, watching } from "#testing/watch.ts";
import { writeHandle } from "#write-handle.ts";

type Reactive = Reactivity["Service"];

const readsOf = (registry: Registry, sql: SqlClient): Record<string, unknown> =>
	Object.fromEntries(registry.rows.map((row) => [row.name, readHandle(sql, codecOf(registry, row))]));

const seedOne = (registry: Registry, sql: SqlClient, reactivity: Reactive, row: RowShape) => (value: unknown) =>
	Effect.gen(function* () {
		const dirty = new Set<string>();
		yield* writeHandle(sql, codecOf(registry, row), (key) => dirty.add(key)).insert(value);
		yield* reactivity.invalidate([...dirty]);
	});

const seedsOf = (registry: Registry, sql: SqlClient, reactivity: Reactive): Record<string, unknown> =>
	Object.fromEntries(registry.rows.map((row) => [row.name, seedOne(registry, sql, reactivity, row)]));

const liveOf =
	(live: LiveService, reactivity: Reactive, scope: Scope.Scope, watches: Watch[]) =>
	<Name extends string, Input extends Fields, Output extends Schema.Top, Watched extends readonly RowShape[]>(
		query: QueryDefinition<Name, Input, Output, Watched>,
		input: Values<Input>,
	): Effect.Effect<Emissions<Output["Type"]>> =>
		Effect.gen(function* () {
			const seen: Output["Type"][] = [];
			const watch = watching(reactivity, keysOf(query.reads, query.scope?.(input)));
			watches.push(watch);
			yield* Effect.addFinalizer(() => Effect.sync(watch.cancel));
			const tracked = {
				...query,
				run: (given: Values<Input>, rows: Parameters<typeof query.run>[1]) =>
					watch.around(Effect.tap(query.run(given, rows), (value) => Effect.sync(() => seen.push(value)))),
			};
			yield* Effect.forkScoped(Stream.runDrain(live.live(tracked, input)));
			return { seen: Effect.sync(() => [...seen]) };
		}).pipe(Effect.provideService(Scope.Scope, scope));

export function kit<Features extends readonly FeatureShape[]>(
	definition: AppDefinition<Features>,
): Effect.Effect<TestApp<Features>, never, Commit | Database | Live | Reactivity | Scope.Scope>;
export function kit(definition: AppDefinition): unknown {
	return Effect.gen(function* () {
		const database = yield* Database;
		const commit = yield* Commit;
		const live = yield* Live;
		const reactivity = yield* Reactivity;
		const scope = yield* Effect.scope;
		const registry = registryOf(definition);
		const watches: Watch[] = [];
		return {
			clock: { advance: (millis: number) => TestClock.adjust(Duration.millis(millis)) },
			commit: commitsOf(definition, commit),
			live: liveOf(live, reactivity, scope, watches),
			rows: readsOf(registry, database.read),
			seed: seedsOf(registry, database.write, reactivity),
			settle: () => Effect.forEach(watches, (watch) => watch.settled, { discard: true }),
		};
	});
}
