import { Effect, Schema } from "effect";
import { PayloadInvalid } from "#errors.ts";

export type ReclaimPolicy = "abandon" | "requeue";

// why: payloads round-trip through a JSON column with no ambient context, so a
// kind's schema must not demand decoding or encoding services.
export type IntentPayloadSchema = Schema.Top & {
	readonly DecodingServices: never;
	readonly EncodingServices: never;
};

export interface IntentKindOptions<PayloadSchema extends IntentPayloadSchema> {
	readonly execute: (
		payload: PayloadSchema["Type"],
	) => Effect.Effect<void, unknown>;
	readonly payload: PayloadSchema;
	readonly reclaim?: ReclaimPolicy;
	readonly tag: string;
}

// why: the kernel stores payloads as a JSON column and replays them after a
// restart, so a kind's schema work is fused into two monomorphic closures
// (encode at submit, decode+execute at admission). That erases the payload
// type from everything the scheduler touches: a heterogeneous registry needs
// no casts because IntentKind is contravariant in Payload.
export interface IntentKind<in Payload> {
	readonly encode: (payload: Payload) => Effect.Effect<string, PayloadInvalid>;
	readonly reclaim: ReclaimPolicy;
	readonly run: (payloadJson: string) => Effect.Effect<void, unknown>;
	readonly tag: string;
}

export type AnyIntentKind = IntentKind<never>;

export const defineIntent = <PayloadSchema extends IntentPayloadSchema>(
	options: IntentKindOptions<PayloadSchema>,
): IntentKind<PayloadSchema["Type"]> => {
	const column = Schema.fromJsonString(options.payload);
	return {
		encode: (payload) =>
			Schema.encodeEffect(column)(payload).pipe(
				Effect.mapError(
					(error) => new PayloadInvalid({ detail: String(error) }),
				),
			),
		reclaim: options.reclaim ?? "requeue",
		run: (payloadJson) =>
			Effect.flatMap(
				Schema.decodeUnknownEffect(column)(payloadJson),
				options.execute,
			),
		tag: options.tag,
	};
};
