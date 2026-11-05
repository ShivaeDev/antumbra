import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Prepared } from "@antumbra/platform-vocabulary/inputs.ts";
import { Schema } from "effect";
import { inputRecorded } from "#facts/recorded.ts";
import { sessionInput } from "#rows/input.ts";
export const record = command("record", {
	input: Prepared.fields,
	reads: [sessionInput, session, capacity],
	emits: inputRecorded,
	rejections: {
		InputRefused: { inputId: Schema.String, detail: Schema.String },
		InputConflict: { inputId: Schema.String },
		InvalidInput: {
			reason: Schema.Literals([
				"corrupt_image",
				"empty_text",
				"image_too_large",
				"input_too_large",
				"invalid_order",
				"too_many_images",
				"unsupported_media",
			]),
			detail: Schema.String,
		},
	},
});
