import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { sessionCapacityWait } from "#rows/session-capacity-wait.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const capacityReleased = query("capacityReleased", {
	input: {},
	output: Schema.Array(sessionOperation.Row),
	reads: [sessionOperation, sessionCapacityWait, capacity],
});
