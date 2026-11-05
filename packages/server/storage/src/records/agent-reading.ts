import { agentReading as row } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("agentReading")({
	id: row.fields.id,
	role: field(row.fields.role),
	status: field(row.fields.status),
	currentSessionId: field(row.fields.currentSessionId),
	createdAt: field(row.fields.createdAt),
	updatedAt: field(row.fields.updatedAt),
	pieceIds: field(jsonb(row.fields.pieceIds)),
	voyageIds: field(jsonb(row.fields.voyageIds)),
	state: field(row.fields.state),
	standing: field(row.fields.standing),
	detail: field(row.fields.detail),
	backend: field(row.fields.backend),
	atWork: field(row.fields.atWork),
	working: field(row.fields.working),
	canSend: field(row.fields.canSend),
	canSleep: field(row.fields.canSleep),
	canInterrupt: field(row.fields.canInterrupt),
	canRetire: field(row.fields.canRetire),
	idleSince: field(row.fields.idleSince),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "agentReading", idColumn: "id", spanPrefix: "agentReading" });

export const selection = [
	"id",
	"role",
	"status",
	"currentSessionId",
	"createdAt",
	"updatedAt",
	"pieceIds",
	"voyageIds",
	"state",
	"standing",
	"detail",
	"backend",
	"atWork",
	"working",
	"canSend",
	"canSleep",
	"canInterrupt",
	"canRetire",
	"idleSince",
] as const;
