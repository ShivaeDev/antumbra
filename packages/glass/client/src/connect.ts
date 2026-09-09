import type { FeatureShape } from "@antumbra/feature/feature.ts";
import { type Api, client } from "@antumbra/rpc/client.ts";
import { RegistryContext, scheduleTask } from "@effect/atom-react";
import { Effect, type Scope } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import type { RpcClientError } from "effect/unstable/rpc/RpcClientError";
import { createElement, type ReactNode } from "react";
import { dialing, type Reach } from "#serving.ts";
import { deferred } from "#wire.ts";

export interface Glass<Features extends readonly FeatureShape[]> {
	readonly api: Api<Features, RpcClientError>;
	readonly Provider: (props: { readonly children?: ReactNode }) => ReactNode;
	readonly registry: AtomRegistry.AtomRegistry;
}

export type Built<Features extends readonly FeatureShape[]> = Effect.Effect<Api<Features, RpcClientError>, never, Scope.Scope>;

export function served<const Features extends readonly FeatureShape[]>(features: Features, built: Built<Features>): Glass<Features>;
export function served(features: readonly FeatureShape[], built: Effect.Effect<unknown, never, Scope.Scope>): unknown {
	const registry = AtomRegistry.make({ defaultIdleTTL: 400, scheduleTask });
	const wire = AtomRegistry.getResult(registry, Atom.keepAlive(Atom.make(built)));
	return {
		api: deferred(features, wire),
		Provider: (props: { readonly children?: ReactNode }) => createElement(RegistryContext.Provider, { value: registry }, props.children),
		registry,
	};
}

export const connect = <const Features extends readonly FeatureShape[]>(features: Features, reach: Reach): Glass<Features> =>
	served(features, Effect.provide(client(features), dialing(reach)));
