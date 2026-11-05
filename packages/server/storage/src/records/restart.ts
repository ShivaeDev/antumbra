import { restart as row } from "@antumbra/domain-lifecycle/rows/restart.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("restart")({
	id: row.fields.id,
	sessionIds: field(jsonb(row.fields.sessionIds)),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "restart", idColumn: "id", spanPrefix: "restart" });

export const selection = ["id", "sessionIds"] as const;
