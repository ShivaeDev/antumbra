import { sessionEvent as row } from "@antumbra/domain-sessions/rows/session-event.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionEvent")({
	id: row.fields.id,
	sessionId: field(bucket(row.fields.sessionId)),
	rootSessionId: field(row.fields.rootSessionId),
	logId: field(row.fields.logId),
	cursor: field(row.fields.cursor),
	observedAt: field(row.fields.observedAt),
	sequence: field(row.fields.sequence),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionEvent",
	idColumn: "id",
	spanPrefix: "sessionEvent",
	collection: collection("sessionEvent", Schema.String, { sessionId: Schema.String }),
});

export const selection = ["id", "sessionId", "rootSessionId", "logId", "cursor", "observedAt", "sequence"] as const;
