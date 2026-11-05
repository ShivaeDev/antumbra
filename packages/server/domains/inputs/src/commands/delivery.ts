import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { inputDeliveryChanged } from "#facts/delivery.ts";
import { sessionInput } from "#rows/input.ts";
export const delivery = command("delivery", {
	input: inputDeliveryChanged.payload,
	reads: [sessionInput],
	emits: inputDeliveryChanged,
	rejections: { InputNotFound: { inputId: Schema.String }, DeliverySettled: { inputId: Schema.String } },
});
