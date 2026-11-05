import { smoothingAttempt as row } from "@antumbra/domain-boards/rows/smoothing-attempt.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("smoothingAttempt")({
	id: row.fields.id,
	voyageId: field(bucket(row.fields.voyageId)),
	pieceId: field(row.fields.pieceId),
	throughToday: field(row.fields.throughToday),
	requestedAt: field(row.fields.requestedAt),
	by: field(row.fields.by),
	status: field(row.fields.status),
	detail: field(row.fields.detail),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "smoothingAttempt",
	idColumn: "id",
	spanPrefix: "smoothingAttempt",
	collection: collection("smoothingAttempt", Schema.String, { voyageId: Schema.String }),
});

export const selection = ["id", "voyageId", "pieceId", "throughToday", "requestedAt", "by", "status", "detail"] as const;
