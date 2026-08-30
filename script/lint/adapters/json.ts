import { Schema } from "effect";

export const jsonDecoder = <S extends Schema.Constraint & { readonly DecodingServices: never }>(schema: S) =>
	Schema.decodeUnknownResult(Schema.fromJsonString(schema));
