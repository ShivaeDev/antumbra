import { moorage as row } from "@antumbra/domain-reclamation/rows/moorage.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("moorage")({
	agentId: row.fields.agentId,
	runner: field(row.fields.runner),
	root: field(row.fields.root),
	status: field(row.fields.status),
	reclaimState: field(row.fields.reclaimState),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "moorage", idColumn: "agentId", spanPrefix: "moorage" });

export const selection = ["agentId", "runner", "root", "status", "reclaimState"] as const;
