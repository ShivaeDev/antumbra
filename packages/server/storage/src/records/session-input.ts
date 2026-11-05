import { sessionInput as row } from "@antumbra/domain-inputs/rows/input.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionInput")({
	id: row.fields.id,
	sessionId: field(bucket(row.fields.sessionId)),
	requestDigest: field(row.fields.requestDigest),
	parts: field(jsonb(row.fields.parts)),
	status: field(row.fields.status),
	detail: field(row.fields.detail),
	createdAt: field(row.fields.createdAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionInput",
	idColumn: "id",
	spanPrefix: "sessionInput",
	collection: collection("sessionInput", Schema.String, { sessionId: Schema.String }),
});

export const selection = ["id", "sessionId", "requestDigest", "parts", "status", "detail", "createdAt"] as const;
