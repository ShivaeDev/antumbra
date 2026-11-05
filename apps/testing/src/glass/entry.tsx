import { apiOf } from "@antumbra/app-testing/api.ts";
import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { ClientConnection } from "@antumbra/glass-client/connection.ts";
import { lostConnection } from "@antumbra/glass-client/query.ts";
import { TooltipProvider } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { NodeServices } from "@effect/platform-node";
import { Activity, type ConnectionStatus } from "@shivaedev/contract/clientActivity.ts";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Context, Effect, Layer, type Scope, Stream, SubscriptionRef } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
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
	const status = Atom.make<ConnectionStatus>("live");
	const state = (connectionStatus: ConnectionStatus) => ({ connectionStatus, liveHints: 0, liveInvalidations: 0, refreshingAtoms: 0, rpcCalls: 0 });
	const client = {
		[Activity]: Object.assign(
			Stream.map(SubscriptionRef.changes(gone), (away) => state(away ? "reconnecting" : "live")),
			{
				connectionStatus: status,
				current: Effect.map(SubscriptionRef.get(gone), (away) => state(away ? "reconnecting" : "live")),
			},
		),
	};
	const server: Reach = {
		away: SubscriptionRef.set(gone, true).pipe(Effect.andThen(Effect.sync(() => glass.registry.set(status, "reconnecting")))),
		back: SubscriptionRef.set(gone, false).pipe(
			Effect.andThen(
				Effect.sync(() => {
					for (const node of [...glass.registry.getNodes().values()]) {
						const value: unknown = node.value();
						if (AsyncResult.isAsyncResult(value) && lostConnection(value)) glass.registry.refresh(node.atom);
					}
					glass.registry.set(status, "live");
				}),
			),
		),
	};
	yield* Effect.addFinalizer(() => Effect.sync(() => glass.registry.dispose()));
	const { container, root } = yield* mount();
	const render = (screen: ReactNode) =>
		settle(() => root.render(dressed(glass.Provider, <ClientConnection value={client}>{screen}</ClientConnection>))).pipe(Effect.as(container));
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
