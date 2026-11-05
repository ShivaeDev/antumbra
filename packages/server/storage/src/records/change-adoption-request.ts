import { adoptionRequest as row } from "@antumbra/domain-changes/rows/adoption-request.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("changeAdoptionRequest")({
	id: row.fields.id,
	pieceId: field(row.fields.pieceId),
	repoId: field(row.fields.repoId),
	error: field(row.fields.error),
	url: field(row.fields.url),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "changeAdoptionRequest", idColumn: "id", spanPrefix: "changeAdoptionRequest" });

export const selection = ["id", "pieceId", "repoId", "error", "url"] as const;
