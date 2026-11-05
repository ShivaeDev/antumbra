import { choose } from "@antumbra/domain-role-settings/commands/choose.ts";
import { defaults } from "@antumbra/domain-role-settings/queries/defaults.ts";
import { forVoyage } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const Choose = command("choose", { payload: choose.Input, success: Schema.Number, rejections: choose.Rejection, invalidates: () => [] });
export const Defaults = stream("defaults", {
	payload: defaults.input,
	success: defaults.output,
	reads: () => [collection("roleSetting", Schema.String).list, collection("backendModel", Schema.String).list],
});
export const ForVoyage = stream("forVoyage", {
	payload: forVoyage.input,
	success: forVoyage.output,
	reads: () => [collection("roleSetting", Schema.String).list, collection("backendModel", Schema.String).list],
});
export const Resolve = stream("resolve", {
	payload: resolve.input,
	success: resolve.output,
	reads: () => [collection("roleSetting", Schema.String).list, collection("backendModel", Schema.String).list],
});
export const RoleSettingsContract = contract("roleSettings", { commands: [Choose], streams: [Defaults, ForVoyage, Resolve] });
