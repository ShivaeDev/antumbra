import { report as row } from "@antumbra/domain-reports/rows/report.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("report")({
	id: row.fields.id,
	authorAgentId: field(row.fields.authorAgentId),
	title: field(row.fields.title),
	body: field(row.fields.body),
	createdAt: field(row.fields.createdAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "report", idColumn: "id", spanPrefix: "report" });

export const selection = ["id", "authorAgentId", "title", "body", "createdAt"] as const;
