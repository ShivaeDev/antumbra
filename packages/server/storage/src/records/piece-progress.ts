import { pieceProgress as row } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceProgress")({
	id: row.fields.id,
	voyageId: field(bucket(row.fields.voyageId)),
	state: field(row.fields.state),
	eligible: field(row.fields.eligible),
	settledDone: field(row.fields.settledDone),
	abandoned: field(row.fields.abandoned),
	concluded: field(row.fields.concluded),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceProgress",
	idColumn: "id",
	spanPrefix: "pieceProgress",
	collection: collection("pieceProgress", Schema.String, { voyageId: Schema.String }),
});

export const selection = ["id", "voyageId", "state", "eligible", "settledDone", "abandoned", "concluded"] as const;
