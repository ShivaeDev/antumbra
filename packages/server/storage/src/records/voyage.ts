import { voyage as row } from "@antumbra/domain-voyages/rows/voyage.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("voyage")({
	id: row.fields.id,
	kind: field(row.fields.kind),
	name: field(row.fields.name),
	northStar: field(row.fields.northStar),
	context: field(row.fields.context),
	focusedAt: field(row.fields.focusedAt),
	quietedAt: field(row.fields.quietedAt),
	openedAt: field(row.fields.openedAt),
	opened_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "voyage", idColumn: "id", spanPrefix: "voyage" });

export const selection = ["id", "kind", "name", "northStar", "context", "focusedAt", "quietedAt", "openedAt"] as const;
