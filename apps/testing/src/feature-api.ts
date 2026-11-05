import type { Api } from "@antumbra/glass-client/api.ts";
import { watching } from "@antumbra/glass-client/query.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { type Rpcs, tagOf } from "@antumbra/platform-feature/rpc.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { keysOf } from "@antumbra/server/keys.ts";
import { type Context, Effect, type Stream } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import type * as RpcClient from "effect/rpc/RpcClient";

interface Loose {
	readonly send: (tag: string, payload: Record<string, unknown>) => Effect.Effect<number, unknown>;
	readonly watch: (tag: string, input: Record<string, unknown>) => Stream.Stream<unknown, unknown>;
}

function loose(calls: unknown): Loose;
function loose(calls: unknown): unknown {
	return { send: calls, watch: calls };
}

const landed = (error: unknown): error is AlreadyDone => error instanceof AlreadyDone;

const sending = (calls: Loose, feature: string, command: CommandShape) =>
	Object.assign(
		(input: Record<string, unknown>): Effect.Effect<number, unknown> =>
			calls
				.send(tagOf(feature, command.name), { requestId: Id.Request.make(Id.make()), ...input })
				.pipe(Effect.catchIf(landed, (done) => Effect.succeed(done.seq))),
		{ command },
	);

const callsOf = (feature: FeatureShape, calls: Loose, reactivity: Context.Service.Shape<typeof Reactivity>): Record<string, unknown> => ({
	...Object.fromEntries(feature.commands.map((command) => [command.name, sending(calls, feature.name, command)])),
	...Object.fromEntries(feature.queries.map((query) => [query.name, watchOf(feature.name, query, calls, reactivity)])),
});

const watchOf = (feature: string, query: QueryShape, calls: Loose, reactivity: Context.Service.Shape<typeof Reactivity>) =>
	watching(query.input, (input) => reactivity.stream(keysOf(query.reads, undefined), calls.send(tagOf(feature, query.name), input)));

const shape = (features: readonly FeatureShape[], calls: Loose, reactivity: Context.Service.Shape<typeof Reactivity>): Record<string, unknown> =>
	Object.fromEntries(features.map((feature) => [feature.name, callsOf(feature, calls, reactivity)]));

export function api<const Features extends readonly FeatureShape[]>(
	features: Features,
	calls: RpcClient.RpcClient.Flat<Rpcs<Features>>,
): Effect.Effect<Api<Features>, never, Reactivity>;
export function api(features: readonly FeatureShape[], calls: unknown): unknown {
	return Effect.map(Reactivity, (reactivity) => shape(features, loose(calls), reactivity));
}
