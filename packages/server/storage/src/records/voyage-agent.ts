import { voyageAgent as row } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("voyageAgent")({
	id: row.fields.id,
	voyageId: field(bucket(row.fields.voyageId)),
	agentId: field(row.fields.agentId),
	role: field(row.fields.role),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "voyageAgent",
	idColumn: "id",
	spanPrefix: "voyageAgent",
	collection: collection("voyageAgent", Schema.String, { voyageId: Schema.String }),
});

export const selection = ["id", "voyageId", "agentId", "role"] as const;
