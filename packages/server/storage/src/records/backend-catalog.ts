import { backendCatalog as row } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("backendCatalog")({
	backend: bucket(row.fields.backend),
	failure: field(row.fields.failure),
	imageInput: field(row.fields.imageInput),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "backendCatalog",
	idColumn: "backend",
	spanPrefix: "backendCatalog",
	collection: collection("backendCatalog", Schema.String, { backend: Schema.String }),
});

export const selection = ["backend", "failure", "imageInput"] as const;
