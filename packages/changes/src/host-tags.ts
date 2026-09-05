import { Effect } from "effect";
import { ChangeHostRegistry } from "#registries.ts";

export const hostTags = Effect.fn("Changes.hostTags")(function* () {
	return [...(yield* ChangeHostRegistry).keys()];
});
