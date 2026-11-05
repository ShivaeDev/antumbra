import { sessionUsage as row } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionUsage")({
	id: row.fields.id,
	sessionId: field(row.fields.sessionId),
	agentId: field(bucket(row.fields.agentId)),
	backend: field(row.fields.backend),
	observedAt: field(row.fields.observedAt),
	usage: field(jsonb(row.fields.usage)),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionUsage",
	idColumn: "id",
	spanPrefix: "sessionUsage",
	collection: collection("sessionUsage", Schema.String, { agentId: Schema.String }),
});

export const selection = ["id", "sessionId", "agentId", "backend", "observedAt", "usage"] as const;
