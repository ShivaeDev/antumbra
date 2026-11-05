import { heldResource as row } from "@antumbra/domain-reclamation/rows/held-resource.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("heldResource")({
	id: row.fields.id,
	berthId: field(bucket(row.fields.berthId)),
	changeId: field(row.fields.changeId),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "heldResource",
	idColumn: "id",
	spanPrefix: "heldResource",
	collection: collection("heldResource", Schema.String, { berthId: Schema.String }),
});

export const selection = ["id", "berthId", "changeId"] as const;
