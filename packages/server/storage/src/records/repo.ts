import { repo as row } from "@antumbra/domain-repos/rows/repo.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("repo")({
	id: row.fields.id,
	name: field(row.fields.name),
	source: field(row.fields.source),
	defaultRef: field(row.fields.defaultRef),
	createdAt: field(row.fields.createdAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "repo", idColumn: "id", spanPrefix: "repo" });

export const selection = ["id", "name", "source", "defaultRef", "createdAt"] as const;
