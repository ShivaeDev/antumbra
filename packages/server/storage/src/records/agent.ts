import { agent as row } from "@antumbra/domain-agents/rows/agent.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("agent")({
	id: row.fields.id,
	role: field(row.fields.role),
	status: field(row.fields.status),
	currentSessionId: field(row.fields.currentSessionId),
	createdAt: field(row.fields.createdAt),
	updatedAt: field(row.fields.updatedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "agent", idColumn: "id", spanPrefix: "agent" });

export const selection = ["id", "role", "status", "currentSessionId", "createdAt", "updatedAt"] as const;
