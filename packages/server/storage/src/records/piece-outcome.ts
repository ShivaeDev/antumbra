import { pieceOutcome as row } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceOutcome")({
	id: row.fields.id,
	pieceId: field(bucket(row.fields.pieceId)),
	sourceKind: field(row.fields.sourceKind),
	sourceId: field(row.fields.sourceId),
	status: field(row.fields.status),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceOutcome",
	idColumn: "id",
	spanPrefix: "pieceOutcome",
	collection: collection("pieceOutcome", Schema.String, { pieceId: Schema.String }),
});

export const selection = ["id", "pieceId", "sourceKind", "sourceId", "status"] as const;
