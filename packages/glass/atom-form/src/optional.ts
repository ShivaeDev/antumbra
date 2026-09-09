import { Schema, SchemaGetter } from "effect";

export const emptyAsNull = <S extends Schema.Constraint & Schema.Top>(
	inner: S,
): Schema.Codec<S["Type"] | null, S["Encoded"] | "", S["DecodingServices"], S["EncodingServices"]> =>
	Schema.Union([inner, Schema.Literal("")]).pipe(
		Schema.decodeTo(Schema.NullOr(inner), {
			decode: SchemaGetter.transform((value) => (value === "" ? null : value)),
			encode: SchemaGetter.transform((value) => (value === null ? "" : value)),
		}),
	);
