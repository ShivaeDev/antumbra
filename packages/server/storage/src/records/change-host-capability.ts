import { hostCapability as row } from "@antumbra/domain-changes/commands/host-capability.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("changeHostCapability")({
	host: row.fields.host,
	available: field(row.fields.available),
	detail: field(row.fields.detail),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "changeHostCapability", idColumn: "host", spanPrefix: "changeHostCapability" });

export const selection = ["host", "available", "detail"] as const;
