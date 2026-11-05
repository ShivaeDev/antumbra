import { pieceChange as row } from "@antumbra/domain-changes/rows/piece-change.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceChange")({
	id: row.fields.id,
	pieceId: field(bucket(row.fields.pieceId)),
	changeId: field(row.fields.changeId),
	purpose: field(row.fields.purpose),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceChange",
	idColumn: "id",
	spanPrefix: "pieceChange",
	collection: collection("pieceChange", Schema.String, { pieceId: Schema.String }),
});

export const selection = ["id", "pieceId", "changeId", "purpose"] as const;
