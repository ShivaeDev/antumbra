import { artifact as row } from "@antumbra/domain-artifacts/rows/artifact.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("artifact")({
	id: row.fields.id,
	pieceId: field(bucket(row.fields.pieceId)),
	authorAgentId: field(row.fields.authorAgentId),
	title: field(row.fields.title),
	digest: field(row.fields.digest),
	byteSize: field(row.fields.byteSize),
	basename: field(row.fields.basename),
	supersededByArtifactId: field(row.fields.supersededByArtifactId),
	createdAt: field(row.fields.createdAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "artifact",
	idColumn: "id",
	spanPrefix: "artifact",
	collection: collection("artifact", Schema.String, { pieceId: Schema.String }),
});

export const selection = [
	"id",
	"pieceId",
	"authorAgentId",
	"title",
	"digest",
	"byteSize",
	"basename",
	"supersededByArtifactId",
	"createdAt",
] as const;
