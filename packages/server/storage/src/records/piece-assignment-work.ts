import { pieceAssignmentWork as row } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceAssignmentWork")({
	id: row.fields.id,
	pieceId: field(bucket(row.fields.pieceId)),
	agentId: field(row.fields.agentId),
	working: field(row.fields.working),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceAssignmentWork",
	idColumn: "id",
	spanPrefix: "pieceAssignmentWork",
	collection: collection("pieceAssignmentWork", Schema.String, { pieceId: Schema.String }),
});

export const selection = ["id", "pieceId", "agentId", "working"] as const;
