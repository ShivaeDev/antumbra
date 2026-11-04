import { setCount } from "@antumbra/domain-settings/commands/set-count.ts";
import { setFlag } from "@antumbra/domain-settings/commands/set-flag.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import { flags } from "@antumbra/domain-settings/queries/flags.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const SetFlag = command("setFlag", { payload: setFlag.Input, success: Schema.Number, rejections: setFlag.Rejection, invalidates: () => [] });
export const SetCount = command("setCount", {
	payload: setCount.Input,
	success: Schema.Number,
	rejections: setCount.Rejection,
	invalidates: () => [],
});
export const Flags = query("flags", {
	payload: flags.input,
	success: flags.output,
	reads: () => [collection("flag", Schema.String).item("fleet")],
	readPolicy: () => Effect.succeed(true),
});
export const Counts = query("counts", {
	payload: counts.input,
	success: counts.output,
	reads: () => [collection("count", Schema.String).item("fleet")],
	readPolicy: () => Effect.succeed(true),
});
export const SettingsContract = contract("settings", { commands: [SetFlag, SetCount], queries: [Flags, Counts] });
