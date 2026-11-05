import { changeVerdict as row } from "@antumbra/domain-changes/rows/change-verdict.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("changeVerdict")({
	changeId: row.fields.changeId,
	verdict: field(row.fields.verdict),
	landedAt: field(row.fields.landedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "changeVerdict", idColumn: "changeId", spanPrefix: "changeVerdict" });

export const selection = ["changeId", "verdict", "landedAt"] as const;
