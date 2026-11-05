import { roleSetting as row } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("roleSetting")({
	id: row.fields.id,
	scope: field(bucket(row.fields.scope)),
	role: field(row.fields.role),
	backend: field(row.fields.backend),
	model: field(row.fields.model),
	effort: field(row.fields.effort),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "roleSetting",
	idColumn: "id",
	spanPrefix: "roleSetting",
	collection: collection("roleSetting", Schema.String, { scope: Schema.String }),
});

export const selection = ["id", "scope", "role", "backend", "model", "effort"] as const;
