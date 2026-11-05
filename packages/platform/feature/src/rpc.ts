import { Owner } from "@antumbra/platform-access/policy.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { Rejections } from "@antumbra/platform-feature/rejection.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { type Command, command, query as operationQuery, type Query } from "@shivaedev/contract/operation.ts";
import type { OperationRpc } from "@shivaedev/contract/operationRpc.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import type { TaggedRejection } from "@shivaedev/contract/rejection.ts";
import { Schema } from "effect";
import type * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";

type CommandOperation<C extends CommandShape> = Command<C["name"], C["Input"], typeof Schema.Number, Rejections<C["rejections"]>>;
type ReadingOperation<Q extends QueryShape> = Query<Q["name"], Schema.Struct<Q["input"]>, Q["output"], Record<never, never>>;

type CommandRpc<Feature extends string, C extends CommandShape> = C extends unknown
	? Rpc.AddMiddleware<OperationRpc<Feature, CommandOperation<C>>, typeof Owner>
	: never;

type QueryRpc<Feature extends string, Q extends QueryShape> = Q extends unknown
	? Rpc.AddMiddleware<OperationRpc<Feature, ReadingOperation<Q>>, typeof Owner>
	: never;

type FeatureRpcs<Feature extends FeatureShape> = Feature extends unknown
	? CommandRpc<Feature["name"], Feature["commands"][number]> | QueryRpc<Feature["name"], Feature["queries"][number]>
	: never;

export type Rpcs<Features extends readonly FeatureShape[]> = FeatureRpcs<Features[number]>;

export const tagOf = (feature: string, name: string): string => `${feature}.${name}`;

interface Declared {
	readonly Input: Schema.Top;
	readonly name: string;
	readonly Rejection: Record<string, TaggedRejection & { readonly Type: { readonly _tag: string } }>;
}

function declared(command: CommandShape): Declared;
function declared(command: unknown): unknown {
	return command;
}

const commandOf = (definition: CommandShape) => {
	const shape = declared(definition);
	return command(shape.name, { payload: shape.Input, success: Schema.Number, rejections: shape.Rejection, invalidates: () => [] });
};

const readingOf = (query: QueryShape) =>
	operationQuery(query.name, { payload: query.input, success: query.output, readPolicy: signedIn, reads: () => [] });

export const contractOf = (feature: FeatureShape) =>
	contract(feature.name, { commands: feature.commands.map(commandOf), queries: feature.queries.map(readingOf) }).middleware(Owner);

export function group<const Features extends readonly FeatureShape[]>(features: Features): RpcGroup.RpcGroup<Rpcs<Features>>;
export function group(features: readonly FeatureShape[]): unknown {
	return RpcGroup.make()
		.merge(...features.map((feature) => contractOf(feature).application))
		.middleware(Owner);
}
