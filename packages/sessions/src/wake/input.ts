import type { SessionInput } from "@antumbra/plugin-api";
import { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Schema } from "effect";

export const WakePayload = Schema.Struct({
	inputId: Schema.optional(SessionInputId),
	message: Schema.optional(Schema.String),
	sessionId: Schema.String,
});
export type WakeFields = typeof WakePayload.Type;

export interface CarriedInput {
	readonly input: SessionInput | undefined;
	readonly inputId: SessionInputId | undefined;
}
