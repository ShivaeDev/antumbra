import type { Api } from "@antumbra/glass-client/api.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { scheduleTask } from "@effect/atom-react";
import { mountLive } from "@shivaedev/react/client/mountLive.ts";
import { Effect, type Scope } from "effect";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { RpcClientError } from "effect/rpc/RpcClientError";
import { binding } from "#binding.ts";
import type { GlassConnection } from "#Provider.tsx";
import { Connection } from "#serving.ts";
import { deferred, queriesOf } from "#wire.ts";
import { wiringOf } from "#wiring.ts";

export interface Glass<Features extends readonly FeatureShape[]> extends GlassConnection {
	readonly api: Api<Features, RpcClientError>;
}

export type Built<Features extends readonly FeatureShape[]> = Effect.Effect<Api<Features, RpcClientError>, never, Scope.Scope>;

export function served<const Features extends readonly FeatureShape[]>(features: Features, built: Built<Features>): Glass<Features>;
export function served(features: readonly FeatureShape[], built: Effect.Effect<unknown, never, Scope.Scope>): unknown {
	const registry = AtomRegistry.make({ defaultIdleTTL: 400, scheduleTask });
	const wire = AtomRegistry.getResult(registry, Atom.keepAlive(Atom.make(built)));
	const api = deferred(features, wire);
	const wiring = wiringOf(queriesOf(features, api));
	return {
		api,
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
			client,
			registry,
			wiring,
		};
	});
}
