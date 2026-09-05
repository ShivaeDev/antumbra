import { Effect } from "effect";
import type { SubmitChangeInput } from "#submissions/model.ts";
import { prepareChange } from "#submissions/prepare.ts";

export const submitChange = Effect.fn("Changes.submit")(function* (input: SubmitChangeInput) {
	return (yield* prepareChange(input)).row;
});
