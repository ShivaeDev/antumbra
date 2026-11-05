import { backendModel as row } from "@antumbra/domain-backends/rows/backend-model.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("backendModel")({
	id: row.fields.id,
	backend: field(bucket(row.fields.backend)),
	model: field(row.fields.model),
	name: field(row.fields.name),
	isDefault: field(row.fields.isDefault),
	defaultEffort: field(row.fields.defaultEffort),
	efforts: field(jsonb(row.fields.efforts)),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "backendModel",
	idColumn: "id",
	spanPrefix: "backendModel",
	collection: collection("backendModel", Schema.String, { backend: Schema.String }),
});

export const selection = ["id", "backend", "model", "name", "isDefault", "defaultEffort", "efforts"] as const;
