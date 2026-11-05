import { sessionCapacityWait as row } from "@antumbra/domain-sessions/rows/session-capacity-wait.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionCapacityWait")({
	id: row.fields.id,
	backend: field(row.fields.backend),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "sessionCapacityWait", idColumn: "id", spanPrefix: "sessionCapacityWait" });

export const selection = ["id", "backend"] as const;
