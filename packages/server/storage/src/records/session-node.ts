import { sessionNode as row } from "@antumbra/domain-sessions/rows/session-node.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("sessionNode")({
	id: row.fields.id,
	rootSessionId: field(bucket(row.fields.rootSessionId)),
	nativeRef: field(row.fields.nativeRef),
	spawnedBy: field(row.fields.spawnedBy),
	announced: field(row.fields.announced),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "sessionNode",
	idColumn: "id",
	spanPrefix: "sessionNode",
	collection: collection("sessionNode", Schema.String, { rootSessionId: Schema.String }),
});

export const selection = ["id", "rootSessionId", "nativeRef", "spawnedBy", "announced"] as const;
