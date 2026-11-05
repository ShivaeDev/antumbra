import { Schema } from "effect";
import { Model } from "effect/schema";
export const field = <S extends Schema.Top>(schema: S) =>
	Model.Field({ select: schema, insert: schema, update: Schema.optionalKey(schema), json: schema });
