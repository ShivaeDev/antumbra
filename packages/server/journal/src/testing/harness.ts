import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { Rpcs } from "@antumbra/platform-rpc/group.ts";
import { ClientToken, layerClient, ServerToken, type Token } from "@antumbra/platform-rpc/token.ts";
import { Layer } from "effect";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import type { Reactivity } from "effect/unstable/reactivity/Reactivity";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import type * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";
import type { AppDefinition } from "#app.ts";
import type { Commit } from "#commit.ts";
import type { Database } from "#database.ts";
import type { TableShapeChanged } from "#errors.ts";
import * as Journal from "#journal.ts";
import type { Live } from "#live.ts";
import { serving } from "#rpc.ts";

export const token = "test-token";

export type Services<Features extends readonly FeatureShape[]> =
	| AtomRegistry.AtomRegistry
	| ClientToken
	| Commit
	| Database
	| Live
	| Reactivity
	| Rpc.ToHandler<Rpcs<Features>>
	| RpcMiddleware.ForClient<Token>
	| ServerToken
	| Token;

export type Harness<Features extends readonly FeatureShape[]> = Layer.Layer<Services<Features>, TableShapeChanged>;

const tokens = Layer.merge(Layer.succeed(ClientToken, { token }), Layer.succeed(ServerToken, { token }));

export const harness = <const Features extends readonly FeatureShape[]>(definition: AppDefinition<Features>): Harness<Features> =>
	Layer.provideMerge(
		Layer.mergeAll(serving(definition.features), layerClient, AtomRegistry.layer),
		Layer.merge(Layer.provideMerge(Journal.layer(definition), Journal.memory()), tokens),
	);
