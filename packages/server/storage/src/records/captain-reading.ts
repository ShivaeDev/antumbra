import { captainReading as row } from "@antumbra/domain-agents/rows/captain-reading.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("captainReading")({
	voyageId: row.fields.voyageId,
	agentId: field(row.fields.agentId),
	currentSessionId: field(row.fields.currentSessionId),
	standing: field(row.fields.standing),
	status: field(row.fields.status),
	atWork: field(row.fields.atWork),
	canHail: field(row.fields.canHail),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "captainReading", idColumn: "voyageId", spanPrefix: "captainReading" });

export const selection = ["voyageId", "agentId", "currentSessionId", "standing", "status", "atWork", "canHail"] as const;
