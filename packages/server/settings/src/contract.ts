import { setCount } from "@antumbra/domain-settings/commands/set-count.ts";
import { setFlag } from "@antumbra/domain-settings/commands/set-flag.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import { flags } from "@antumbra/domain-settings/queries/flags.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const SetFlag = command("setFlag", { payload: setFlag.Input, success: Schema.Number, rejections: setFlag.Rejection, invalidates: () => [] });
export const SetCount = command("setCount", {
	payload: setCount.Input,
	success: Schema.Number,
	rejections: setCount.Rejection,
	invalidates: () => [],
});
export const Flags = stream("flags", {
	payload: flags.input,
	success: flags.output,
	reads: () => [{ _tag: "Bucket", collection: "flag", field: "scope", value: "fleet" }],
});
export const Counts = stream("counts", {
	payload: counts.input,
	success: counts.output,
	reads: () => [{ _tag: "Bucket", collection: "count", field: "scope", value: "fleet" }],
});
export const SettingsContract = contract("settings", { commands: [SetFlag, SetCount], streams: [Flags, Counts] });
