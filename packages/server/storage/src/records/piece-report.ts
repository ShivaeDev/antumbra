import { pieceReport as row } from "@antumbra/domain-reports/rows/piece-report.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceReport")({
	id: row.fields.id,
	pieceId: field(bucket(row.fields.pieceId)),
	reportId: field(row.fields.reportId),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceReport",
	idColumn: "id",
	spanPrefix: "pieceReport",
	collection: collection("pieceReport", Schema.String, { pieceId: Schema.String }),
});

export const selection = ["id", "pieceId", "reportId"] as const;
