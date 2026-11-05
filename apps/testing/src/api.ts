import type { Api } from "@antumbra/glass-client/api.ts";
import type { Owner } from "@antumbra/platform-access/policy.ts";
import type { AppDefinition } from "@antumbra/platform-feature/app.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { group, type Rpcs } from "@antumbra/platform-feature/rpc.ts";
import { Effect, type Scope } from "effect";
import type * as Rpc from "effect/rpc/Rpc";
import * as RpcTest from "effect/rpc/RpcTest";
import { api } from "#feature-api.ts";

export type Bound<Features extends readonly FeatureShape[]> = Rpc.ToHandler<Rpcs<Features>> | Owner;

export function apiOf<const Features extends readonly FeatureShape[]>(
	definition: AppDefinition<Features>,
): Effect.Effect<Api<Features>, never, Bound<Features> | Scope.Scope>;
export function apiOf(definition: AppDefinition): unknown {
	return Effect.flatMap(RpcTest.makeClient(group(definition.features), { flatten: true }), (calls) => api(definition.features, calls));
}
