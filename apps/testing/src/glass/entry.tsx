import { apiOf } from "@antumbra/app-testing/api.ts";
import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { TooltipProvider } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { NodeServices } from "@effect/platform-node";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Context, Effect, Layer, type Scope, SubscriptionRef } from "effect";
import type { Reactivity } from "effect/reactivity/Reactivity";
import type { SqlClient } from "effect/sql/SqlClient";
import type { ReactNode } from "react";
import { definition, layer } from "#app.ts";
import type { ApplicationServices } from "#application-story.ts";
import { ScriptedArtifacts } from "#artifacts.ts";
import { dropping } from "#glass/away.ts";
import { mount, settle } from "#glass/dom.ts";
import { postgresTests } from "#postgres-testing.ts";

export type Api = Glass<typeof definition.features>["api"];

type Provider = (props: { readonly children: ReactNode }) => ReactNode;

const dressed = (Connected: Provider, screen: ReactNode): ReactNode => (
	<Connected>
		<TooltipProvider>{screen}</TooltipProvider>
	</Connected>
);

type Services = ApplicationServices;

interface Reach {
	readonly away: Effect.Effect<void>;
	readonly back: Effect.Effect<void>;
}

interface GlassTest {
	readonly api: Api;
	readonly artifacts: ScriptedArtifacts["Service"];
	readonly render: (screen: ReactNode) => Effect.Effect<HTMLElement>;
	readonly server: Reach;
	readonly run: <Value, Failure, Requirements>(
		effect: Effect.Effect<Value, Failure, Requirements>,
	) => Effect.Effect<Value, Failure, Exclude<Requirements, Services>>;
}

const create = Effect.fn("GlassStory.create")(function* () {
	const services = Context.merge(yield* Effect.context<Reactivity | SqlClient>(), yield* Layer.build(layer));
	const api = yield* apiOf(definition).pipe(Effect.provideContext(services));
	const gone = yield* SubscriptionRef.make(false);
	const glass = served(definition.features, Effect.succeed(dropping(definition.features, api, gone)));
	const server: Reach = { away: SubscriptionRef.set(gone, true), back: SubscriptionRef.set(gone, false) };
	yield* Effect.addFinalizer(() => Effect.sync(() => glass.registry.dispose()));
	const { container, root } = yield* mount();
	const render = (screen: ReactNode) => settle(() => root.render(dressed(glass.Provider, screen))).pipe(Effect.as(container));
	const run = <Value, Failure, Requirements>(effect: Effect.Effect<Value, Failure, Requirements>) => effect.pipe(Effect.provideContext(services));
	const artifacts = yield* run(ScriptedArtifacts);
	return { api: glass.api, artifacts, render, run, server };
});
const glassStory = storyKit({
	name: "Antumbra glass",
	clock: "test",
	layer: postgresTests.pipe(Layer.provideMerge(NodeServices.layer)),
	around: withIsolatedDatabase,
	stages: [],
	create,
	verbs: (engine) => engine,
});
export const it = {
	glass: <Done,>(name: string, body: (test: GlassTest) => Generator<Effect.Effect<unknown, unknown, Scope.Scope>, Done, never>): void =>
		glassStory.it(name, [], body),
};
