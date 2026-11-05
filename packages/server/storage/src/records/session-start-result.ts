import { sessionStartResult as row } from "@antumbra/domain-sessions/rows/session-start-result.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionStartResult")({
	requestId: row.fields.requestId,
	sessionId: field(row.fields.sessionId),
	status: field(row.fields.status),
	reason: field(row.fields.reason),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "sessionStartResult", idColumn: "requestId", spanPrefix: "sessionStartResult" });

export const selection = ["requestId", "sessionId", "status", "reason"] as const;
