import { pieceEdge as row } from "@antumbra/domain-pieces/rows/piece-edge.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceEdge")({
	id: row.fields.id,
	from: field(row.fields.from),
	to: field(bucket(row.fields.to)),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceEdge",
	idColumn: "id",
	spanPrefix: "pieceEdge",
	collection: collection("pieceEdge", Schema.String, { to: Schema.String }),
});

export const selection = ["id", "from", "to"] as const;
