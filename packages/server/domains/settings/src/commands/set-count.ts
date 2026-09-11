import { command } from "@antumbra/feature/command.ts";
import { titled } from "@antumbra/feature/edit.ts";
import { Effect, Schema } from "effect";
import { countSet } from "#facts/count-set.ts";
import { COUNTS, CountKey } from "#ids.ts";

export const setCount = command("setCount", {
	input: { key: CountKey, count: titled(Schema.Number.check(Schema.isInt()), { title: "Count" }) },
	reads: [],
	emits: countSet,
	rejections: { OutOfRange: { field: Schema.String, key: CountKey, max: Schema.Number, message: Schema.String, min: Schema.Number } },
	run: (input, _rows, reject) => {
		const declaration = COUNTS[input.key];
		if (input.count < declaration.min || input.count > declaration.max) {
			return reject.OutOfRange({
				field: "count",
				key: input.key,
				max: declaration.max,
				message: `${declaration.title} takes a whole number from ${declaration.min} to ${declaration.max}`,
				min: declaration.min,
			});
		}
		return Effect.succeed({ count: input.count, key: input.key });
	},
});
