import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { inputDeliveryChanged } from "#facts/delivery.ts";
import { sessionInput } from "#rows/input.ts";
export const delivery = command("delivery", {
	input: inputDeliveryChanged.payload,
	reads: [sessionInput],
	emits: inputDeliveryChanged,
	rejections: { InputNotFound: { inputId: Schema.String }, DeliverySettled: { inputId: Schema.String } },
	run: Effect.fn("inputs.delivery")(function* (input, rows, reject) {
		const held = yield* rows.sessionInput.find(input.id);
		if (Option.isNone(held)) return yield* reject.InputNotFound({ inputId: input.id });
		if (held.value.status === "accepted" || held.value.status === "ambiguous") return yield* reject.DeliverySettled({ inputId: input.id });
		return { id: input.id, status: input.status, detail: input.detail };
	}),
});
