import { pieceRulingGate as row } from "@antumbra/domain-pieces/rows/piece-ruling-gate.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceRulingGate")({
	id: row.fields.id,
	pieceId: field(bucket(row.fields.pieceId)),
	rulingId: field(row.fields.rulingId),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceRulingGate",
	idColumn: "id",
	spanPrefix: "pieceRulingGate",
	collection: collection("pieceRulingGate", Schema.String, { pieceId: Schema.String }),
});

export const selection = ["id", "pieceId", "rulingId"] as const;
