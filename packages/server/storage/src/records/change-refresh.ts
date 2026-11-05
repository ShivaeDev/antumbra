import { changeRefresh as row } from "@antumbra/domain-changes/commands/refresh.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("changeRefresh")({
	id: row.fields.id,
	request: field(row.fields.request),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "changeRefresh", idColumn: "id", spanPrefix: "changeRefresh" });

export const selection = ["id", "request"] as const;
