import { rulingGate as row } from "@antumbra/domain-rulings/rows/gate.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("rulingGate")({
	id: row.fields.id,
	rulingId: field(bucket(row.fields.rulingId)),
	pieceId: field(row.fields.pieceId),
	question: field(row.fields.question),
	open: field(row.fields.open),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "rulingGate",
	idColumn: "id",
	spanPrefix: "rulingGate",
	collection: collection("rulingGate", Schema.String, { rulingId: Schema.String }),
});

export const selection = ["id", "rulingId", "pieceId", "question", "open"] as const;
