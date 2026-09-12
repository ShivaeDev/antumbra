import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { MAX_SESSION_IMAGES, MAX_SESSION_INPUT_IMAGE_BYTES } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import { inputRecorded } from "#facts/recorded.ts";
import { sessionInput } from "#rows/input.ts";
import { Prepared } from "#schema.ts";
export const record = command("record", {
	input: Prepared.fields,
	reads: [sessionInput, session],
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
	run: Effect.fn("inputs.record")(function* (input, rows, reject) {
		const target = yield* rows.session.find(SessionId.make(input.sessionId));
		if (Option.isNone(target) || target.value.status !== "open" || target.value.parentSessionId !== null)
			return yield* reject.InputRefused({ inputId: input.id, detail: "only an open root session can receive input" });
		const existing = yield* rows.sessionInput.find(input.id);
		if (Option.isSome(existing)) return yield* reject.InputConflict({ inputId: input.id });
		const texts = input.parts.filter((part) => part.type === "text");
		if (texts.some((part) => part.text.trim() === "")) return yield* reject.InvalidInput({ reason: "empty_text", detail: "text is blank" });
		const firstText = input.parts.findIndex((part) => part.type === "text");
		if (texts.length > 1 || (firstText >= 0 && input.parts.slice(firstText + 1).some((part) => part.type === "image")))
			return yield* reject.InvalidInput({ reason: "invalid_order", detail: "images must come first, followed by at most one text part" });
		const images = input.parts.filter((part) => part.type === "image");
		if (images.length > MAX_SESSION_IMAGES) return yield* reject.InvalidInput({ reason: "too_many_images", detail: "too many images" });
		if (images.reduce((size, part) => size + part.attachment.byteSize, 0) > MAX_SESSION_INPUT_IMAGE_BYTES)
			return yield* reject.InvalidInput({ reason: "input_too_large", detail: "normalized images exceed the input limit" });
		return { id: input.id, sessionId: input.sessionId, requestDigest: input.requestDigest, parts: input.parts };
	}),
});
