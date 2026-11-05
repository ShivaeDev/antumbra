import type { Bound } from "@antumbra/app-testing/api.ts";
import { type Watch, watching } from "@antumbra/app-testing/watch.ts";
import type { AppDefinition } from "@antumbra/platform-feature/app.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryDefinition } from "@antumbra/platform-feature/query.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { group, tagOf } from "@antumbra/platform-rpc/group.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { keysOf } from "@antumbra/server/keys.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema, Scope, Stream } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import * as RpcTest from "effect/rpc/RpcTest";
import * as TestClock from "effect/testing/TestClock";
import { readings } from "#readings.ts";
import type { TestKit } from "#surface.ts";

type Call = (tag: string, payload: Record<string, unknown>) => Effect.Effect<number, unknown>;
function calls(client: unknown): Call;
function calls(client: unknown): unknown {
	return client;
}

type Reading = <Name extends string, Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]>(
	query: QueryDefinition<Name, Input, Output, Reads>,
	input: Values<Input>,
) => Effect.Effect<Output["Type"], never, Records>;
function reading(): Reading;
function reading(): unknown {
	return (query: QueryDefinition<string, Fields, Schema.Top, readonly RowShape[]>, input: Record<string, unknown>) =>
		Effect.gen(function* () {
			const read = readings.get(query);
			if (read === undefined) return yield* Effect.die(new Error(`No SQL reading is registered for ${query.name}`));
			return yield* read(input).pipe(Effect.flatMap(Schema.decodeUnknownEffect(query.output)), Effect.orDie);
		});
}

export function sqlKit<Features extends readonly FeatureShape[]>(
	definition: AppDefinition<Features>,
): Effect.Effect<TestKit<Features>, never, Records | Reactivity | Scope.Scope | Bound<Features>>;
export function sqlKit(definition: AppDefinition): unknown {
	return Effect.gen(function* () {
		const reactivity = yield* Reactivity;
		const scope = yield* Effect.scope;
		const send = calls(yield* RpcTest.makeClient(group(definition.features), { flatten: true }));
		const rows = yield* Records;
		const watches: Watch[] = [];
		const live = reading();
		const watch: TestKit<readonly FeatureShape[]>["live"] = (query, input) =>
			Effect.gen(function* () {
				const seen: (typeof query.output.Type)[] = [];
				const keys = keysOf(query.reads, query.scope?.(input));
				const observer = watching(reactivity, keys);
				watches.push(observer);
				yield* Effect.addFinalizer(() => Effect.sync(observer.cancel));
				yield* Effect.forkScoped(
					Stream.runForEach(reactivity.stream(keys, observer.around(live(query, input))), ({ value, generation }) =>
						Effect.sync(() => {
							seen.push(value);
							observer.delivered(generation);
						}),
					),
				);
				return { seen: Effect.sync(() => [...seen]) };
			}).pipe(Effect.provideService(Scope.Scope, scope), Effect.provideService(Records, rows));
		return {
			clock: { advance: (millis: number) => TestClock.adjust(millis) },
			commit: Object.fromEntries(
				definition.features.map((feature) => [
					feature.name,
					Object.fromEntries(
						feature.commands.map((command) => [
							command.name,
							(input: Record<string, unknown>) => send(tagOf(feature.name, command.name), { requestId: Request.make(make()), ...input }),
						]),
					),
				]),
			),
			live: watch,
			rows,
			settle: () => Effect.forEach(watches, (watch) => watch.settled, { discard: true }),
		};
	});
}
