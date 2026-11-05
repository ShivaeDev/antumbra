import type { Api } from "@antumbra/glass-client/api.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { RegistryContext, scheduleTask } from "@effect/atom-react";
import { mountLive } from "@shivaedev/react/client/mountLive.ts";
import { Effect, type Scope } from "effect";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { RpcClientError } from "effect/rpc/RpcClientError";
import { createElement, type ReactNode } from "react";
import { binding } from "#binding.ts";
import { ClientConnection } from "#connection.ts";
import { Connection } from "#serving.ts";
import { deferred, queriesOf } from "#wire.ts";
import { type Wiring, WiringContext, wiringOf } from "#wiring.ts";

export interface Glass<Features extends readonly FeatureShape[]> {
	readonly api: Api<Features, RpcClientError>;
	readonly Provider: (props: { readonly children?: ReactNode }) => ReactNode;
	readonly registry: AtomRegistry.AtomRegistry;
	readonly wiring: Wiring;
}

export type Built<Features extends readonly FeatureShape[]> = Effect.Effect<Api<Features, RpcClientError>, never, Scope.Scope>;

const around = (registry: AtomRegistry.AtomRegistry, wiring: Wiring, children: ReactNode): ReactNode =>
	createElement(RegistryContext.Provider, { value: registry }, createElement(WiringContext.Provider, { value: wiring }, children));

export function served<const Features extends readonly FeatureShape[]>(features: Features, built: Built<Features>): Glass<Features>;
export function served(features: readonly FeatureShape[], built: Effect.Effect<unknown, never, Scope.Scope>): unknown {
	const registry = AtomRegistry.make({ defaultIdleTTL: 400, scheduleTask });
	const wire = AtomRegistry.getResult(registry, Atom.keepAlive(Atom.make(built)));
	const api = deferred(features, wire);
	const wiring = wiringOf(queriesOf(features, api));
	return {
		api,
		Provider: (props: { readonly children?: ReactNode }) => around(registry, wiring, props.children),
		registry,
		wiring,
	};
}

export function connect<const Features extends readonly FeatureShape[]>(
	features: Features,
): Effect.Effect<Glass<Features>, never, Connection | Scope.Scope>;
export function connect(features: readonly FeatureShape[]): unknown {
	return Effect.gen(function* () {
		const reach = yield* Connection;
		const serving = yield* reach;
		const registry = AtomRegistry.make({ defaultIdleTTL: 400, scheduleTask });
		yield* Effect.addFinalizer(() => Effect.sync(() => registry.dispose()));
		const { api, client } = yield* binding(features, serving, registry);
		const release = yield* mountLive(api).pipe(Effect.provideService(AtomRegistry.AtomRegistry, registry));
		yield* Effect.addFinalizer(() => Effect.sync(release));
		const wiring = wiringOf(queriesOf(features, api));
		return {
			api,
			registry,
			wiring,
			Provider: (props: { readonly children?: ReactNode }) =>
				around(registry, wiring, createElement(ClientConnection, { value: client }, props.children)),
		};
	});
}
