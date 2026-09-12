import type * as Rpc from "effect/unstable/rpc/Rpc";
import type * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import type { FeatureShape } from "#feature.ts";

export type ProcedureNames<Feature extends FeatureShape> = Feature["commands"][number]["name"] | Feature["queries"][number]["name"];

type TagsOf<Group> = RpcGroup.Rpcs<Group>["_tag"];

export type Extension<Feature extends FeatureShape, Group> = [Extract<TagsOf<Group>, ProcedureNames<Feature>>] extends [never]
	? unknown
	: { readonly "the feature already has a procedure with this name": Extract<TagsOf<Group>, ProcedureNames<Feature>> };

export function extending<const Feature extends FeatureShape, const Group extends RpcGroup.Any>(
	feature: Feature,
	group: Group & Extension<NoInfer<Feature>, NoInfer<Group>>,
): RpcGroup.RpcGroup<Rpc.Prefixed<RpcGroup.Rpcs<Group>, `${Feature["name"]}.`>>;
export function extending(feature: FeatureShape, group: RpcGroup.RpcGroup<Rpc.Any>): unknown {
	return group.prefix(`${feature.name}.`);
}
