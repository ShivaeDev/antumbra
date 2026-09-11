import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { AlreadyDone, RejectedBy, RejectionSpecs } from "@antumbra/platform-feature/rejection.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import type * as RpcSchema from "effect/unstable/rpc/RpcSchema";
import { Token } from "#token.ts";

export type Tag<Feature extends string, Name extends string> = `${Feature}.${Name}`;

export type Rejects<Specs extends RejectionSpecs> = Schema.Codec<AlreadyDone | RejectedBy<Specs>, unknown>;

export type CommandRpc<Feature extends string, Command extends CommandShape> = Command extends CommandShape
	? Rpc.Rpc<Tag<Feature, Command["name"]>, Command["Input"], typeof Schema.Number, Rejects<Command["rejections"]>, typeof Token>
	: never;

export type QueryRpc<Feature extends string, Query extends QueryShape> = Query extends QueryShape
	? Rpc.Rpc<
			Tag<Feature, Query["name"]>,
			Schema.Struct<Query["input"]>,
			RpcSchema.Stream<Query["output"], typeof Schema.Never>,
			typeof Schema.Never,
			typeof Token
		>
	: never;

export type FeatureRpcs<Feature extends FeatureShape> = Feature extends FeatureShape
	? CommandRpc<Feature["name"], Feature["commands"][number]> | QueryRpc<Feature["name"], Feature["queries"][number]>
	: never;

export type Rpcs<Features extends readonly FeatureShape[]> = FeatureRpcs<Features[number]>;

export const tagOf = (feature: string, name: string): string => `${feature}.${name}`;

interface Declared {
	readonly Input: Schema.Top;
	readonly name: string;
	readonly Rejection: Record<string, Schema.Top>;
}

function declared(command: CommandShape): Declared;
function declared(command: unknown): unknown {
	return command;
}

const commandRpc = (feature: string, command: CommandShape): Rpc.Any => {
	const shape = declared(command);
	return Rpc.make(tagOf(feature, shape.name), {
		error: Schema.Union(Object.values(shape.Rejection)),
		payload: shape.Input,
		success: Schema.Number,
	});
};

const queryRpc = (feature: string, query: QueryShape): Rpc.Any =>
	Rpc.make(tagOf(feature, query.name), { payload: Schema.Struct(query.input), stream: true, success: query.output });

const rpcsOf = (feature: FeatureShape): readonly Rpc.Any[] => [
	...feature.commands.map((command) => commandRpc(feature.name, command)),
	...feature.queries.map((query) => queryRpc(feature.name, query)),
];

export function group<const Features extends readonly FeatureShape[]>(features: Features): RpcGroup.RpcGroup<Rpcs<Features>>;
export function group(features: readonly FeatureShape[]): unknown {
	return RpcGroup.make(...features.flatMap(rpcsOf)).middleware(Token);
}
