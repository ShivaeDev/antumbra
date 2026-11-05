import { birth as row } from "@antumbra/domain-agents/rows/birth.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("birth")({
	id: row.fields.id,
	operationRequestId: field(row.fields.operationRequestId),
	createsAgent: field(row.fields.createsAgent),
	cwd: field(row.fields.cwd),
	source: field(row.fields.source),
	agentId: field(row.fields.agentId),
	sessionId: field(row.fields.sessionId),
	voyageId: field(row.fields.voyageId),
	pieceId: field(row.fields.pieceId),
	backend: field(row.fields.backend),
	model: field(row.fields.model),
	effort: field(row.fields.effort),
	role: field(row.fields.role),
	status: field(row.fields.status),
	detail: field(row.fields.detail),
	requestedAt: field(row.fields.requestedAt),
	admittedAt: field(row.fields.admittedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "birth", idColumn: "id", spanPrefix: "birth" });

export const selection = [
	"id",
	"operationRequestId",
	"createsAgent",
	"cwd",
	"source",
	"agentId",
	"sessionId",
	"voyageId",
	"pieceId",
	"backend",
	"model",
	"effort",
	"role",
	"status",
	"detail",
	"requestedAt",
	"admittedAt",
] as const;
