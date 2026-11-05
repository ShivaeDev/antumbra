import { sessionOpening as row } from "@antumbra/domain-sessions/rows/session-opening.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionOpening")({
	id: row.fields.id,
	inputId: field(row.fields.inputId),
	standingOrders: field(row.fields.standingOrders),
	charter: field(row.fields.charter),
	sequence: field(row.fields.sequence),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "sessionOpening", idColumn: "id", spanPrefix: "sessionOpening" });

export const selection = ["id", "inputId", "standingOrders", "charter", "sequence"] as const;
