import { message as row } from "@antumbra/domain-mail/rows/message.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("message")({
	id: row.fields.id,
	toAgentId: field(bucket(row.fields.toAgentId)),
	authorAgentId: field(row.fields.authorAgentId),
	body: field(row.fields.body),
	precedence: field(row.fields.precedence),
	sentAt: field(row.fields.sentAt),
	deliveredAt: field(row.fields.deliveredAt),
	readAt: field(row.fields.readAt),
	sent_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "message",
	idColumn: "id",
	spanPrefix: "message",
	collection: collection("message", Schema.String, { toAgentId: Schema.String }),
});

export const selection = ["id", "toAgentId", "authorAgentId", "body", "precedence", "sentAt", "deliveredAt", "readAt"] as const;
