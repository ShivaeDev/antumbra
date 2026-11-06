import { apiOf } from "@antumbra/app-testing/api.ts";
import { postgresTests } from "@antumbra/app-testing/postgres-testing.ts";
import type { FactPayload, FactShape } from "@antumbra/platform-feature/fact.ts";
import { postgresDefinition } from "@antumbra/server/postgres-definition.ts";
import { ServerRuntime } from "@antumbra/server/runtime.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { type Observation, observation } from "@antumbra/server-storage/observe.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Context, Effect, Layer } from "effect";
import type { Reactivity } from "effect/reactivity/Reactivity";
import type { SqlClient } from "effect/sql/SqlClient";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import type { StoryCrypto } from "@shivaedev/test-story/server/storyIt.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { eventually } from "#answers.ts";
import { definition, layer } from "#app.ts";
import { ScriptedArtifacts } from "#artifacts.ts";
import { hosted } from "#hosted.ts";
import { sqlKit } from "#sql-story.ts";
import type { TestApp } from "#surface.ts";

export type ApplicationServices = Layer.Success<typeof layer> | Reactivity | SqlClient;

export type App = TestApp<typeof definition.features> & {
	readonly clock: {
		readonly advance: (millis: number) => Effect.Effect<void>;
		readonly waitingForDue: (loop: string, at: number) => Effect.Effect<void>;
	};
	readonly artifacts: ScriptedArtifacts["Service"];
	readonly host: () => Effect.Effect<
		Effect.Success<ReturnType<typeof hosted>>,
		Effect.Error<ReturnType<typeof hosted>>,
		import("effect").Scope.Scope
	>;
	readonly observe: <Fact extends FactShape>(fact: Fact, record: Observation<FactPayload<Fact>>) => Effect.Effect<number>;
};

const create = Effect.fn("ApplicationStory.create")(function* () {
	const services = Context.merge(yield* Effect.context<Reactivity | SqlClient | StoryCrypto>(), yield* Layer.build(layer));
	const app = yield* Effect.gen(function* () {
		const parts = yield* sqlKit(definition);
		const api = yield* apiOf(definition);
		const artifacts = yield* ScriptedArtifacts;
		const history = yield* ExecutionHistory;
		const observe = <Fact extends FactShape>(fact: Fact, record: Observation<FactPayload<Fact>>) =>
			history
				.ingest({
					logId: record.logId,
					entries: [{ cursor: record.cursor, at: record.at, before: Effect.void, facts: [observation(fact, record.payload)] }],
				})
				.pipe(Effect.orDie);
		const waitingForDue = (loop: string, at: number) =>
			Effect.gen(function* () {
				const state = (yield* ServerRuntime).loops.state(loop);
				if (state === undefined) return yield* Effect.die(new Error(`No running reconciler named ${loop}`));
				yield* eventually(state, (state) => state.status === "waiting" && state.nextDue === at, `${loop} to arm its due timer`);
			}).pipe(Effect.provideContext(services));
		return {
			...parts,
			host: () => hosted().pipe(Effect.provideContext(services)),
			clock: { ...parts.clock, waitingForDue },
			api,
			artifacts,
			observe,
		};
	}).pipe(Effect.provideContext(services));
	return { app, services };
});

export const applicationStory = storyKit({
	name: "Antumbra application",
	clock: "test",
	layer: postgresTests.pipe(Layer.provideMerge(NodeServices.layer), Layer.provideMerge(postgresDefinition)),
	around: withIsolatedDatabase,
	stages: ["application"],
	create,
	after: { application: (engine) => engine.services },
	verbs: (engine) => engine.app,
	inspect: () => ({}),
});
