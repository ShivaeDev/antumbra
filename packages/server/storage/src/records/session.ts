import { session as row } from "@antumbra/domain-sessions/rows/session.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("session")({
	id: row.fields.id,
	agentId: field(bucket(row.fields.agentId)),
	backend: field(row.fields.backend),
	cwd: field(row.fields.cwd),
	nativeRef: field(row.fields.nativeRef),
	status: field(row.fields.status),
	executionStatus: field(row.fields.executionStatus),
	completeness: field(row.fields.completeness),
	outcome: field(row.fields.outcome),
	label: field(row.fields.label),
	kind: field(row.fields.kind),
	parentSessionId: field(row.fields.parentSessionId),
	rootSessionId: field(row.fields.rootSessionId),
	runnerId: field(row.fields.runnerId),
	toolSetVersion: field(row.fields.toolSetVersion),
	startRequestId: field(row.fields.startRequestId),
	charterDeliveredAt: field(row.fields.charterDeliveredAt),
	attached: field(row.fields.attached),
	idleSince: field(row.fields.idleSince),
	stoppedAt: field(row.fields.stoppedAt),
	openDelegations: field(row.fields.openDelegations),
	toolCalls: field(row.fields.toolCalls),
	createdAt: field(row.fields.createdAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "session",
	idColumn: "id",
	spanPrefix: "session",
	collection: collection("session", Schema.String, { agentId: Schema.String }),
});

export const selection = [
	"id",
	"agentId",
	"backend",
	"cwd",
	"nativeRef",
	"status",
	"executionStatus",
	"completeness",
	"outcome",
	"label",
	"kind",
	"parentSessionId",
	"rootSessionId",
	"runnerId",
	"toolSetVersion",
	"startRequestId",
	"charterDeliveredAt",
	"attached",
	"idleSince",
	"stoppedAt",
	"openDelegations",
	"toolCalls",
	"createdAt",
] as const;
