import { voyagePieceProgress as row } from "@antumbra/domain-voyages/rows/voyage-piece-progress.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("voyagePieceProgress")({
	id: row.fields.id,
	voyageId: field(bucket(row.fields.voyageId)),
	state: field(row.fields.state),
	lastStirredAt: field(row.fields.lastStirredAt),
	concluded: field(row.fields.concluded),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "voyagePieceProgress",
	idColumn: "id",
	spanPrefix: "voyagePieceProgress",
	collection: collection("voyagePieceProgress", Schema.String, { voyageId: Schema.String }),
});

export const selection = ["id", "voyageId", "state", "lastStirredAt", "concluded"] as const;
