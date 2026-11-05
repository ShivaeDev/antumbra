import { changeFeedback as row } from "@antumbra/domain-changes/rows/change-feedback.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("changeFeedback")({
	id: row.fields.id,
	changeId: field(bucket(row.fields.changeId)),
	kind: field(row.fields.kind),
	author: field(row.fields.author),
	verdict: field(row.fields.verdict),
	path: field(row.fields.path),
	line: field(row.fields.line),
	body: field(row.fields.body),
	url: field(row.fields.url),
	at: field(row.fields.at),
	forwardedAt: field(row.fields.forwardedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "changeFeedback",
	idColumn: "id",
	spanPrefix: "changeFeedback",
	collection: collection("changeFeedback", Schema.String, { changeId: Schema.String }),
});

export const selection = ["id", "changeId", "kind", "author", "verdict", "path", "line", "body", "url", "at", "forwardedAt"] as const;
