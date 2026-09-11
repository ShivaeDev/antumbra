import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { type Api, api } from "@antumbra/platform-rpc/client.ts";
import { group, type Rpcs } from "@antumbra/platform-rpc/group.ts";
import type { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect, type Scope } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import type * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import type { AppDefinition } from "#app.ts";

export type Bound<Features extends readonly FeatureShape[]> = Rpc.ToHandler<Rpcs<Features>> | RpcMiddleware.ForClient<Token> | Token;

export function apiOf<const Features extends readonly FeatureShape[]>(
	definition: AppDefinition<Features>,
): Effect.Effect<Api<Features>, never, Bound<Features> | Scope.Scope>;
export function apiOf(definition: AppDefinition): unknown {
	return Effect.map(RpcTest.makeClient(group(definition.features), { flatten: true }), (calls) => api(definition.features, calls));
}
