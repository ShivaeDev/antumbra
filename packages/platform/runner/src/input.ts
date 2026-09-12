import { SessionImageMediaType } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";

export const InputPart = Schema.Union([
	Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
	Schema.Struct({
		type: Schema.Literal("image"),
		attachmentId: Schema.String,
		mediaType: SessionImageMediaType,
		digest: Schema.String,
		position: Schema.Int,
	}),
]);
export const Input = Schema.Struct({ id: Schema.String, parts: Schema.NonEmptyArray(InputPart) });
export type Input = typeof Input.Type;
export const DeliveryAct = Schema.Literals(["queue", "steer"]);
