import { sessionSituation as row } from "@antumbra/domain-changes/rows/session-situation.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionSituation")({
	id: row.fields.id,
	sessionId: field(bucket(row.fields.sessionId)),
	changeId: field(row.fields.changeId),
	reference: field(row.fields.reference),
	situation: field(row.fields.situation),
	label: field(row.fields.label),
	text: field(row.fields.text),
	feedbackIds: field(jsonb(row.fields.feedbackIds)),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionSituation",
	idColumn: "id",
	spanPrefix: "sessionSituation",
	collection: collection("sessionSituation", Schema.String, { sessionId: Schema.String }),
});

export const selection = ["id", "sessionId", "changeId", "reference", "situation", "label", "text", "feedbackIds"] as const;
