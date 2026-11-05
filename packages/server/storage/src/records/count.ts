import { count as row } from "@antumbra/domain-settings/rows/count.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("count")({
	key: row.fields.key,
	scope: field(bucket(row.fields.scope)),
	count: field(row.fields.count),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "count",
	idColumn: "key",
	spanPrefix: "count",
	collection: collection("count", Schema.String, { scope: Schema.String }),
});

export const selection = ["key", "scope", "count"] as const;
