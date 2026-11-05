import { sessionToolCall as row } from "@antumbra/domain-sessions/rows/session-tool-call.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionToolCall")({
	id: row.fields.id,
	callId: field(row.fields.callId),
	sessionId: field(bucket(row.fields.sessionId)),
	name: field(row.fields.name),
	input: field(row.fields.input),
	answeredAt: field(row.fields.answeredAt),
	answer: field(jsonb(row.fields.answer)),
	calledAt: field(row.fields.calledAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionToolCall",
	idColumn: "id",
	spanPrefix: "sessionToolCall",
	collection: collection("sessionToolCall", Schema.String, { sessionId: Schema.String }),
});

export const selection = ["id", "callId", "sessionId", "name", "input", "answeredAt", "answer", "calledAt"] as const;
