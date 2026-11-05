import { voyageActivity as row } from "@antumbra/domain-voyages/rows/voyage-activity.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("voyageActivity")({
	id: row.fields.id,
	voyageId: field(bucket(row.fields.voyageId)),
	sourceKind: field(row.fields.sourceKind),
	sourceId: field(row.fields.sourceId),
	at: field(row.fields.at),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "voyageActivity",
	idColumn: "id",
	spanPrefix: "voyageActivity",
	collection: collection("voyageActivity", Schema.String, { voyageId: Schema.String }),
});

export const selection = ["id", "voyageId", "sourceKind", "sourceId", "at"] as const;
