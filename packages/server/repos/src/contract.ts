import { forget } from "@antumbra/domain-repos/commands/forget.ts";
import { register } from "@antumbra/domain-repos/commands/register.ts";
import { all } from "@antumbra/domain-repos/queries/all.ts";
import { byId } from "@antumbra/domain-repos/queries/by-id.ts";
import { byIds } from "@antumbra/domain-repos/queries/by-ids.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Register = command("register", {
	payload: register.Input,
	success: Schema.Number,
	rejections: register.Rejection,
	invalidates: () => [],
});
export const Forget = command("forget", { payload: forget.Input, success: Schema.Number, rejections: forget.Rejection, invalidates: () => [] });
export const All = query("all", {
	payload: all.input,
	success: all.output,
	reads: () => [collection("repo", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ById = query("byId", {
	payload: byId.input,
	success: byId.output,
	reads: () => [collection("repo", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ByIds = query("byIds", {
	payload: byIds.input,
	success: byIds.output,
	reads: () => [collection("repo", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ReposContract = contract("repos", { commands: [Register, Forget], queries: [All, ById, ByIds] });
