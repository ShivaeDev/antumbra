import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { SessionOperationId } from "#ids.ts";
import { sessionOperation } from "#rows/session-operation.ts";

export const operationHeld = fact("SessionOperationHeld", { id: SessionOperationId, detail: Schema.String, backend: Schema.NullOr(Schema.String) });
export const hold = command("hold", {
	input: { id: SessionOperationId, detail: Schema.String },
	reads: [sessionOperation],
	emits: operationHeld,
	rejections: {},
});
export const holdCapacity = command("holdCapacity", {
	input: { id: SessionOperationId, detail: Schema.String, backend: Schema.String },
	reads: [sessionOperation],
	emits: operationHeld,
	rejections: {},
});
