import { pieceAgent as row } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("pieceAgent")({
	id: row.fields.id,
	pieceId: field(bucket(row.fields.pieceId)),
	agentId: field(row.fields.agentId),
	assignedAt: field(row.fields.assignedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "pieceAgent",
	idColumn: "id",
	spanPrefix: "pieceAgent",
	collection: collection("pieceAgent", Schema.String, { pieceId: Schema.String }),
});

export const selection = ["id", "pieceId", "agentId", "assignedAt"] as const;
