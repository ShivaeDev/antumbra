import { choose } from "@antumbra/domain-role-settings/commands/choose.ts";
import { defaults } from "@antumbra/domain-role-settings/queries/defaults.ts";
import { forVoyage } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Choose = command("choose", { payload: choose.Input, success: Schema.Number, rejections: choose.Rejection, invalidates: () => [] });
export const Defaults = query("defaults", {
	payload: defaults.input,
	success: defaults.output,
	reads: () => [collection("roleSetting", Schema.String).list, collection("backendModel", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ForVoyage = query("forVoyage", {
	payload: forVoyage.input,
	success: forVoyage.output,
	reads: () => [collection("roleSetting", Schema.String).list, collection("backendModel", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Resolve = query("resolve", {
	payload: resolve.input,
	success: resolve.output,
	reads: () => [collection("roleSetting", Schema.String).list, collection("backendModel", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const RoleSettingsContract = contract("roleSettings", { commands: [Choose], queries: [Defaults, ForVoyage, Resolve] });
