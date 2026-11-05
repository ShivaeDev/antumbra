import type * as Source from "@antumbra/domain-settings/commands/set-count.ts";
import { Effect } from "effect";
import { COUNTS } from "#logic/queries/counts.ts";

export const setCount = (input: typeof Source.setCount.Input.Type, reject: typeof Source.setCount.reject) => {
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
};
