import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionOperationId } from "#ids.ts";
export const sessionCapacityWait = row("sessionCapacityWait", { id: SessionOperationId, backend: Schema.String }, { key: "id" });
