import type { PrismaError } from "@antumbra/persistence";
import type { SessionInput } from "@antumbra/plugin-api";
import { admiralWords } from "@antumbra/prompts";
import {
	type SessionInputFailure,
	SessionInputNotFound,
	SessionInputs,
} from "@antumbra/session-inputs";
import { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect, Schema } from "effect";
import { admiralInput, promptInput } from "#session-input.ts";

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

export const makeLoadCarriedInput = Effect.gen(function* () {
	const inputs = yield* SessionInputs;
	return (
		fields: WakeFields,
	): Effect.Effect<CarriedInput, PrismaError | SessionInputFailure> =>
		Effect.gen(function* () {
			if (fields.inputId !== undefined) {
				const inputId = fields.inputId;
				const stored = yield* inputs.load(inputId);
				if (stored.sessionId !== fields.sessionId) {
					return yield* new SessionInputNotFound({ inputId });
				}
				return { input: admiralInput(stored.input), inputId };
			}
			return {
				input:
					fields.message === undefined
						? undefined
						: promptInput(admiralWords({ words: fields.message })),
				inputId: undefined,
			};
		});
});
