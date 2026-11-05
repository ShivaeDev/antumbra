import { voyageProgress as row } from "@antumbra/domain-voyages/rows/voyage-progress.ts";
import { jsonb } from "@shivaedev/sql/jsonb.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("voyageProgress")({
	id: row.fields.id,
	total: field(row.fields.total),
	counts: field(jsonb(row.fields.counts)),
	state: field(row.fields.state),
	lastStirredAt: field(row.fields.lastStirredAt),
	concluded: field(row.fields.concluded),
}) {}
export const repository = makeRepository(Stored, { tableName: "voyageProgress", idColumn: "id", spanPrefix: "voyageProgress" });

export const selection = ["id", "total", "counts", "state", "lastStirredAt", "concluded"] as const;
