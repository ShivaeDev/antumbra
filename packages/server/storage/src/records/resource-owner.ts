import { resourceOwner as row } from "@antumbra/domain-reclamation/rows/resource-owner.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("resourceOwner")({
	agentId: row.fields.agentId,
	status: field(row.fields.status),
	openSessions: field(row.fields.openSessions),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "resourceOwner", idColumn: "agentId", spanPrefix: "resourceOwner" });

export const selection = ["agentId", "status", "openSessions"] as const;
