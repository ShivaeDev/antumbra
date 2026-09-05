import { Effect } from "effect";
import type { SubmitChangeInput } from "#change-submissions/model.ts";
import { prepareChange } from "#change-submissions/prepare.ts";

export const submitChange = Effect.fn("Changes.submit")(function* (input: SubmitChangeInput) {
	return (yield* prepareChange(input)).row;
});
