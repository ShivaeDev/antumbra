import { repoReference as row } from "@antumbra/domain-repos/rows/repo-reference.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("repoReference")({
	id: row.fields.id,
	repoId: field(bucket(row.fields.repoId)),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "repoReference",
	idColumn: "id",
	spanPrefix: "repoReference",
	collection: collection("repoReference", Schema.String, { repoId: Schema.String }),
});

export const selection = ["id", "repoId"] as const;
