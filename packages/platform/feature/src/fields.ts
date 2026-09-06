import type { Schema } from "effect";

export type Fields = { readonly [key in PropertyKey]: Schema.ConstraintCodec<unknown, unknown> };

export type Values<Of extends Fields> = Schema.Struct.Type<Of>;
