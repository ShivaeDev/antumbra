import { smoothingSession as row } from "@antumbra/domain-boards/rows/smoothing-session.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("smoothingSession")({
	sessionId: row.fields.sessionId,
	attemptId: field(bucket(row.fields.attemptId)),
	agentId: field(row.fields.agentId),
	coversFrom: field(row.fields.coversFrom),
	coversTo: field(row.fields.coversTo),
	board: field(row.fields.board),
	pieceId: field(row.fields.pieceId),
	title: field(row.fields.title),
	level: field(row.fields.level),
	status: field(row.fields.status),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "smoothingSession",
	idColumn: "sessionId",
	spanPrefix: "smoothingSession",
	collection: collection("smoothingSession", Schema.String, { attemptId: Schema.String }),
});

export const selection = ["sessionId", "attemptId", "agentId", "coversFrom", "coversTo", "board", "pieceId", "title", "level", "status"] as const;
