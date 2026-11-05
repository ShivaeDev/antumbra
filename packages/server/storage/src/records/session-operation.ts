import { sessionOperation as row } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionOperation")({
	id: row.fields.id,
	sessionId: field(bucket(row.fields.sessionId)),
	kind: field(row.fields.kind),
	inputId: field(row.fields.inputId),
	reason: field(row.fields.reason),
	status: field(row.fields.status),
	detail: field(row.fields.detail),
	requestedAt: field(row.fields.requestedAt),
	sequence: field(row.fields.sequence),
	gatedBy: field(row.fields.gatedBy),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionOperation",
	idColumn: "id",
	spanPrefix: "sessionOperation",
	collection: collection("sessionOperation", Schema.String, { sessionId: Schema.String }),
});

export const selection = ["id", "sessionId", "kind", "inputId", "reason", "status", "detail", "requestedAt", "sequence", "gatedBy"] as const;
