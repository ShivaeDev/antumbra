import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import type { Unauthorized } from "@shivaedev/errors/taxonomy.ts";
import type { Effect } from "effect";
import type { Watch } from "#query.ts";

export type Sent<Command extends CommandShape> = Values<Command["input"]> & {
	readonly requestId?: import("@antumbra/platform-vocabulary/id.ts").Request;
};

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
