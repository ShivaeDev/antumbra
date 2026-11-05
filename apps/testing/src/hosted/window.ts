import { connect } from "@antumbra/glass-client/connect.ts";
import { Connection, type Serving } from "@antumbra/glass-client/serving.ts";
import { LiveConnection } from "@shivaedev/contract/automaticLive.ts";
import { liveBindings } from "@shivaedev/contract/composeBindings.ts";
import { Effect, Exit, Scope } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { eventually } from "#answers.ts";
import { definition } from "#app.ts";

export const window = Effect.fn("HostedStory.window")(function* (serving: Serving) {
	const scope = yield* Scope.fork(yield* Effect.scope);
	const glass = yield* connect(definition.features).pipe(Effect.provideService(Connection, Effect.succeed(serving)), Scope.provide(scope));
	const bindings = liveBindings(glass.api);
	for (const binding of bindings) glass.registry.set(binding[LiveConnection].coalesceWindow, 0);
	const seen: number[] = [];
	const unsubscribe = glass.registry.subscribe(
		glass.api.settings.counts.atom({}),
		(result) => {
			if (AsyncResult.isSuccess(result)) {
				const count = result.value.find((row) => row.key === "maxParallelSessions")?.count;
				if (count !== undefined) seen.push(count);
			}
		},
		{ immediate: true },
	);
	yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
	return {
		support: (sessionId: string) =>
			Effect.gen(function* () {
				const atom = glass.api.inputs.support.atom({ sessionId });
				yield* Effect.acquireRelease(
					Effect.sync(() => glass.registry.mount(atom)),
					(release) => Effect.sync(release),
				);
				return {
					value: (expected: boolean) =>
						eventually(glass.api.inputs.support({ sessionId }), (value) => value.imageInput === expected, `image support ${expected}`),
				};
			}),
		api: glass.api,
		Provider: glass.Provider,
		seen: () => [...seen],
		count: (expected: number) =>
			eventually(
				glass.api.settings.counts({}),
				(rows) => rows.some((row) => row.key === "maxParallelSessions" && row.count === expected),
				`window count ${expected}`,
			),
		pause: Effect.sync(() => {
			for (const binding of bindings) glass.registry.set(binding[LiveConnection].paused, true);
		}),
		resume: Effect.sync(() => {
			for (const binding of bindings) glass.registry.set(binding[LiveConnection].paused, false);
		}),
		close: Scope.close(scope, Exit.void),
	};
});
