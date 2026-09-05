import { admiralWords } from "@antumbra/prompts";
import { Effect } from "effect";
import { promptInput } from "#input.ts";
import { load } from "#input-delivery/load.ts";
import type { CarriedInput, WakeFields } from "#wake/input.ts";

export const carried = Effect.fn("SessionInputDelivery.carried")(function* (fields: WakeFields) {
	if (fields.inputId !== undefined) {
		return { input: yield* load(fields.sessionId, fields.inputId), inputId: fields.inputId } satisfies CarriedInput;
	}
	return {
		input: fields.message === undefined ? undefined : promptInput(admiralWords({ words: fields.message })),
		inputId: undefined,
	} satisfies CarriedInput;
});
