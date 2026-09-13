import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Schema } from "effect";
import type { Fields } from "#fields.ts";

const stamp = { at: Schema.Number, requestId: Request, seq: Schema.Number };

const reserved = Object.keys(stamp);

export interface FactShape {
	readonly name: string;
	readonly payload: Fields;
	readonly subject: string | undefined;
	readonly Payload: Schema.ConstraintCodec<unknown, unknown>;
	readonly Fact: Schema.ConstraintCodec<unknown, unknown>;
}

export interface FactDefinition<Name extends string, Payload extends Fields> extends FactShape {
	readonly name: Name;
	readonly payload: Payload;
	readonly Payload: Schema.Struct<Payload>;
	readonly Fact: Schema.Struct<Payload & typeof stamp>;
}

export type FactPayload<Fact extends FactShape> = Fact["Payload"]["Type"];

export type FactValue<Fact extends FactShape> = Fact["Fact"]["Type"];

export function fact<Name extends string, const Payload extends Fields>(
	name: Name,
	payload: Payload,
	observes?: { readonly subject: keyof Payload & string },
): FactDefinition<Name, Payload>;
export function fact(name: string, payload: Fields, observes?: { readonly subject: string }): unknown {
	for (const field of reserved) {
		if (field in payload)
			Effect.runSync(Effect.die(new Error(`the fact "${name}" declares the field "${field}", which the journal stamps on every fact`)));
	}
	return { Fact: Schema.Struct({ ...payload, ...stamp }), name, Payload: Schema.Struct(payload), payload, subject: observes?.subject };
}
