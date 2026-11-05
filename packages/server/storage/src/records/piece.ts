import { piece as row } from "@antumbra/domain-pieces/rows/piece.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("piece")({
	id: row.fields.id,
	voyageId: field(bucket(row.fields.voyageId)),
	title: field(row.fields.title),
	charter: field(row.fields.charter),
	expectation: field(row.fields.expectation),
	role: field(row.fields.role),
	charteredAt: field(row.fields.charteredAt),
	launchedAt: field(row.fields.launchedAt),
	parkedAt: field(row.fields.parkedAt),
	verdict: field(row.fields.verdict),
	chartered_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "piece",
	idColumn: "id",
	spanPrefix: "piece",
	collection: collection("piece", Schema.String, { voyageId: Schema.String }),
});

export const selection = ["id", "voyageId", "title", "charter", "expectation", "role", "charteredAt", "launchedAt", "parkedAt", "verdict"] as const;
