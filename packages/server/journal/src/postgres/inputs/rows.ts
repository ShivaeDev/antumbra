import { row } from "@antumbra/platform-feature/row.ts";
import { SessionInput } from "@antumbra/platform-vocabulary/inputs.ts";
import { Capacity } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Session } from "@antumbra/platform-vocabulary/session.ts";
import { SessionOperation } from "@antumbra/platform-vocabulary/session-operation.ts";
import { Effect } from "effect";
import { backendCatalog } from "#postgres/backends/rows.ts";
import { rowsOf } from "#postgres/rows.ts";

const externalbackendCatalog = rowsOf(backendCatalog, "backendCatalog");

export const sessionInput = row("sessionInput", SessionInput.fields, { key: "id", scope: "sessionId" });
export const session = row("session", Session.fields, { key: "id", scope: "agentId" });
export const sessionOperation = row("sessionOperation", SessionOperation.fields, { key: "id", scope: "sessionId" });
export const capacity = row("capacity", Capacity.fields, { key: "backend" });
export const rows = Effect.gen(function* () {
	return {
		sessionInput: yield* rowsOf(sessionInput, "sessionInput", "storage_order"),
		session: yield* rowsOf(session, "input_sessions", "storage_order"),
		sessionOperation: yield* rowsOf(sessionOperation, "input_operations", "storage_order"),
		capacity: yield* rowsOf(capacity, "input_capacity", "storage_order"),
		backendCatalog: yield* externalbackendCatalog,
	};
});
