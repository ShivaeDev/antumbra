import { voyageCaptainWork as row } from "@antumbra/domain-voyages/rows/voyage-captain-work.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("voyageCaptainWork")({
	id: row.fields.id,
	voyageId: field(bucket(row.fields.voyageId)),
	agentId: field(row.fields.agentId),
	working: field(row.fields.working),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "voyageCaptainWork",
	idColumn: "id",
	spanPrefix: "voyageCaptainWork",
	collection: collection("voyageCaptainWork", Schema.String, { voyageId: Schema.String }),
});

export const selection = ["id", "voyageId", "agentId", "working"] as const;
