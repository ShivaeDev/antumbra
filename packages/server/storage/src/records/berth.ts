import { berth as row } from "@antumbra/domain-reclamation/rows/berth.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("berth")({
	id: row.fields.id,
	agentId: field(bucket(row.fields.agentId)),
	runner: field(row.fields.runner),
	source: field(row.fields.source),
	slug: field(row.fields.slug),
	ref: field(row.fields.ref),
	branch: field(row.fields.branch),
	path: field(row.fields.path),
	status: field(row.fields.status),
	reclaimRequestId: field(row.fields.reclaimRequestId),
	reclaimResult: field(row.fields.reclaimResult),
	reclaimState: field(row.fields.reclaimState),
	strandedAt: field(row.fields.strandedAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "berth",
	idColumn: "id",
	spanPrefix: "berth",
	collection: collection("berth", Schema.String, { agentId: Schema.String }),
});

export const selection = [
	"id",
	"agentId",
	"runner",
	"source",
	"slug",
	"ref",
	"branch",
	"path",
	"status",
	"reclaimRequestId",
	"reclaimResult",
	"reclaimState",
	"strandedAt",
] as const;
