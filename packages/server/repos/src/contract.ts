import { forget } from "@antumbra/domain-repos/commands/forget.ts";
import { register } from "@antumbra/domain-repos/commands/register.ts";
import { all } from "@antumbra/domain-repos/queries/all.ts";
import { byId } from "@antumbra/domain-repos/queries/by-id.ts";
import { byIds } from "@antumbra/domain-repos/queries/by-ids.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const Register = command("register", {
	payload: register.Input,
	success: Schema.Number,
	rejections: register.Rejection,
	invalidates: () => [],
});
export const Forget = command("forget", { payload: forget.Input, success: Schema.Number, rejections: forget.Rejection, invalidates: () => [] });
export const All = stream("all", {
	payload: all.input,
	success: all.output,
	reads: () => [collection("repo", Schema.String).list],
});
export const ById = stream("byId", {
	payload: byId.input,
	success: byId.output,
	reads: () => [collection("repo", Schema.String).list],
});
export const ByIds = stream("byIds", {
	payload: byIds.input,
	success: byIds.output,
	reads: () => [collection("repo", Schema.String).list],
});
export const ReposContract = contract("repos", { commands: [Register, Forget], streams: [All, ById, ByIds] });
