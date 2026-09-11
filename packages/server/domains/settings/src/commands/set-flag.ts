import { command } from "@antumbra/feature/command.ts";
import { titled } from "@antumbra/feature/edit.ts";
import { Effect, Schema } from "effect";
import { flagSet } from "#facts/flag-set.ts";
import { FlagKey } from "#ids.ts";

export const setFlag = command("setFlag", {
	input: { key: FlagKey, on: titled(Schema.Boolean, { title: "On" }) },
	reads: [],
	emits: flagSet,
	rejections: {},
	run: (input) => Effect.succeed({ key: input.key, on: input.on }),
});
