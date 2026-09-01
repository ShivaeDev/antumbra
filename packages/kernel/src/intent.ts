import { Effect, Schema } from "effect";
import { PayloadInvalid } from "#errors.ts";
import { type IntentExecution, makeIntentWorkflow } from "#workflow.ts";

export type ReclaimPolicy = "abandon" | "requeue";

// Payloads persist as standalone JSON, so their schemas cannot require services.
type IntentPayloadSchema = Schema.Top & {
	readonly DecodingServices: never;
	readonly EncodingServices: never;
};

interface IntentKindOptions<PayloadSchema extends IntentPayloadSchema> {
	readonly execute: (payload: PayloadSchema["Type"]) => Effect.Effect<void, unknown, IntentExecution>;
	readonly payload: PayloadSchema;
	readonly reclaim?: ReclaimPolicy;
	readonly tag: string;
}

interface RegisteredIntentKind {
	readonly reclaim: ReclaimPolicy;
	readonly run: (intentId: string, payloadJson: string) => Effect.Effect<void, unknown>;
	readonly tag: string;
}

export interface IntentKind<Payload> extends RegisteredIntentKind {
	readonly decode: (payloadJson: string) => Effect.Effect<Payload, PayloadInvalid>;
	readonly encode: (payload: Payload) => Effect.Effect<string, PayloadInvalid>;
}

export type AnyIntentKind = RegisteredIntentKind;

export const defineIntent = <PayloadSchema extends IntentPayloadSchema>(
	options: IntentKindOptions<PayloadSchema>,
): IntentKind<PayloadSchema["Type"]> => {
	const column = Schema.fromJsonString(options.payload);
	const decode = (payloadJson: string) =>
		Schema.decodeUnknownEffect(column)(payloadJson).pipe(Effect.mapError((error) => new PayloadInvalid({ detail: String(error) })));
	const workflow = makeIntentWorkflow(options.tag, (payloadJson) => Effect.flatMap(decode(payloadJson), options.execute));
	return {
		decode,
		encode: (payload) => Schema.encodeEffect(column)(payload).pipe(Effect.mapError((error) => new PayloadInvalid({ detail: String(error) }))),
		reclaim: options.reclaim ?? "requeue",
		run: workflow.run,
		tag: options.tag,
	};
};
