import { Schema } from "effect";
export class InvalidInput extends Schema.TaggedError<InvalidInput>()("InvalidInput", {
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
}) {}
export class InputConflict extends Schema.TaggedError<InputConflict>()("InputConflict", { inputId: Schema.String }) {}
export class InputNotFound extends Schema.TaggedError<InputNotFound>()("InputNotFound", { inputId: Schema.String }) {}
export class ImageUnavailable extends Schema.TaggedError<ImageUnavailable>()("ImageUnavailable", { detail: Schema.String }) {}
export class InputAmbiguous extends Schema.TaggedError<InputAmbiguous>()("InputAmbiguous", { inputId: Schema.String }) {}
export class InputRefused extends Schema.TaggedError<InputRefused>()("InputRefused", { inputId: Schema.String, detail: Schema.String }) {}
export const InputFailure = Schema.Union([InvalidInput, InputConflict, InputNotFound, ImageUnavailable, InputAmbiguous, InputRefused]);
export type InputFailure = typeof InputFailure.Type;
