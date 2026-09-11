import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { AlreadyDone, type RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect, type Scope, type Stream } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import type { RpcClientError } from "effect/unstable/rpc/RpcClientError";
import type * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";
import { group, type Rpcs, tagOf } from "#group.ts";
import { type Watch, watching } from "#query.ts";
import type { Token, Unauthorized } from "#token.ts";

export type Sent<Command extends CommandShape> = Values<Command["input"]> & { readonly requestId?: Id.Request };

export interface Send<Command extends CommandShape, Failure> {
	(input: Sent<Command>): Effect.Effect<number, Failure | RejectedBy<Command["rejections"]> | Unauthorized>;
	readonly command: Command;
}

export type Calls<Feature extends FeatureShape, Failure> = Feature extends FeatureShape
	? { readonly [Command in Feature["commands"][number] as Command["name"]]: Send<Command, Failure> } & {
			readonly [Query in Feature["queries"][number] as Query["name"]]: Watch<Query, Failure>;
		}
	: never;

export type Api<Features extends readonly FeatureShape[], Failure = never> = {
	readonly [Feature in Features[number] as Feature["name"]]: Calls<Feature, Failure>;
};

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

const callsOf = (feature: FeatureShape, calls: Loose): Record<string, unknown> => ({
	...Object.fromEntries(feature.commands.map((command) => [command.name, sending(calls, feature.name, command)])),
	...Object.fromEntries(feature.queries.map((query) => [query.name, watchOf(feature.name, query, calls)])),
});

const watchOf = (feature: string, query: QueryShape, calls: Loose) =>
	watching(query.input, (input) => calls.watch(tagOf(feature, query.name), input));

const shape = (features: readonly FeatureShape[], calls: Loose): Record<string, unknown> =>
	Object.fromEntries(features.map((feature) => [feature.name, callsOf(feature, calls)]));

export function api<const Features extends readonly FeatureShape[]>(
	features: Features,
	calls: RpcClient.RpcClient.Flat<Rpcs<Features>>,
): Api<Features>;
export function api(features: readonly FeatureShape[], calls: unknown): unknown {
	return shape(features, loose(calls));
}

export function client<const Features extends readonly FeatureShape[]>(
	features: Features,
): Effect.Effect<Api<Features, RpcClientError>, never, RpcClient.Protocol | RpcMiddleware.ForClient<Token> | Scope.Scope>;
export function client(features: readonly FeatureShape[]): unknown {
	return Effect.map(RpcClient.make(group(features), { flatten: true }), (calls) => shape(features, loose(calls)));
}
