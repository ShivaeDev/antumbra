import { sessionGap as row } from "@antumbra/domain-sessions/rows/session-gap.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionGap")({
	id: row.fields.id,
	sessionId: field(bucket(row.fields.sessionId)),
	kind: field(row.fields.kind),
	detail: field(row.fields.detail),
	observedAt: field(row.fields.observedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionGap",
	idColumn: "id",
	spanPrefix: "sessionGap",
	collection: collection("sessionGap", Schema.String, { sessionId: Schema.String }),
});

export const selection = ["id", "sessionId", "kind", "detail", "observedAt"] as const;
