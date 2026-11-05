import { flag as row } from "@antumbra/domain-settings/rows/flag.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("flag")({
	key: row.fields.key,
	scope: field(bucket(row.fields.scope)),
	on: field(row.fields.on),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "flag",
	idColumn: "key",
	spanPrefix: "flag",
	collection: collection("flag", Schema.String, { scope: Schema.String }),
});

export const selection = ["key", "scope", "on"] as const;
