import { changeTransition as row } from "@antumbra/domain-changes/rows/change-transition.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("changeTransition")({
	id: row.fields.id,
	changeId: field(bucket(row.fields.changeId)),
	fromStage: field(row.fields.fromStage),
	toStage: field(row.fields.toStage),
	activityAt: field(row.fields.activityAt),
	observedAt: field(row.fields.observedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "changeTransition",
	idColumn: "id",
	spanPrefix: "changeTransition",
	collection: collection("changeTransition", Schema.String, { changeId: Schema.String }),
});

export const selection = ["id", "changeId", "fromStage", "toStage", "activityAt", "observedAt"] as const;
