import { capacity as row } from "@antumbra/domain-capacity/rows/capacity.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("capacity")({
	backend: row.fields.backend,
	status: field(row.fields.status),
	reason: field(row.fields.reason),
	detail: field(row.fields.detail),
	observedAt: field(row.fields.observedAt),
	resetsAt: field(row.fields.resetsAt),
	utilization: field(row.fields.utilization),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "capacity", idColumn: "backend", spanPrefix: "capacity" });

export const selection = ["backend", "status", "reason", "detail", "observedAt", "resetsAt", "utilization"] as const;
