import { boardEntry as row } from "@antumbra/domain-boards/rows/board-entry.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("boardEntry")({
	id: row.fields.id,
	board: field(bucket(row.fields.board)),
	seq: field(row.fields.seq),
	kind: field(row.fields.kind),
	register: field(row.fields.register),
	authorAgentId: field(row.fields.authorAgentId),
	body: field(row.fields.body),
	level: field(row.fields.level),
	coversFrom: field(row.fields.coversFrom),
	coversTo: field(row.fields.coversTo),
	pieceId: field(row.fields.pieceId),
	createdAt: field(row.fields.createdAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "boardEntry",
	idColumn: "id",
	spanPrefix: "boardEntry",
	collection: collection("boardEntry", Schema.String, { board: Schema.String }),
});

export const selection = [
	"id",
	"board",
	"seq",
	"kind",
	"register",
	"authorAgentId",
	"body",
	"level",
	"coversFrom",
	"coversTo",
	"pieceId",
	"createdAt",
] as const;
