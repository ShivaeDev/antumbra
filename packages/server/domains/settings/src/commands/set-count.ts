import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { CountKey } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { Schema } from "effect";
import { countSet } from "#facts/count-set.ts";

export const setCount = command("setCount", {
	input: { key: CountKey, count: titled(Schema.Number.check(Schema.isInt()), { title: "Count" }) },
	reads: [],
	emits: countSet,
	rejections: { OutOfRange: { field: Schema.String, key: CountKey, max: Schema.Number, message: Schema.String, min: Schema.Number } },
});
