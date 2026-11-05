import { stoppedLoop as row } from "@antumbra/domain-supervision/rows/stopped-loop.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("stoppedLoop")({
	loop: row.fields.loop,
	at: field(row.fields.at),
	message: field(row.fields.message),
	trace: field(row.fields.trace),
	state: field(row.fields.state),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, { tableName: "stoppedLoop", idColumn: "loop", spanPrefix: "stoppedLoop" });

export const selection = ["loop", "at", "message", "trace", "state"] as const;
