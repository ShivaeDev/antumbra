import { setCount } from "@antumbra/domain-settings/commands/set-count.ts";
import { setFlag } from "@antumbra/domain-settings/commands/set-flag.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import { flags } from "@antumbra/domain-settings/queries/flags.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const SetFlag = command("setFlag", { payload: setFlag.Input, success: Schema.Number, rejections: setFlag.Rejection, invalidates: () => [] });
export const SetCount = command("setCount", {
	payload: setCount.Input,
	success: Schema.Number,
	rejections: setCount.Rejection,
	invalidates: () => [],
});
export const Flags = query("flags", {
	readPolicy: signedIn,
	payload: flags.input,
	success: flags.output,
	reads: () => [{ _tag: "Bucket", collection: "flag", field: "scope", value: "fleet" }],
});
export const Counts = query("counts", {
	readPolicy: signedIn,
	payload: counts.input,
	success: counts.output,
	reads: () => [{ _tag: "Bucket", collection: "count", field: "scope", value: "fleet" }],
});
export const SettingsContract = contract("settings", { commands: [SetFlag, SetCount], queries: [Flags, Counts] });
