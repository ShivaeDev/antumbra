import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

interface NodeAdoption {
	readonly kind: string | undefined;
	readonly label: string | undefined;
	readonly parentSessionId: string;
}

export const adoptNode = Effect.fn("SessionTreeRows.adoptNode")(function* (sessionId: string, adoption: NodeAdoption) {
	const db = yield* Database;
	const row = yield* db.AgentSession.where({ id: sessionId }).first();
	if (Option.isNone(row)) {
		return;
	}
	yield* db.AgentSession.where({
		id: sessionId,
		kind: row.value.kind,
		label: row.value.label,
		parentSessionId: row.value.parentSessionId,
	}).update({
		...(row.value.kind === null && adoption.kind !== undefined ? { kind: adoption.kind } : {}),
		...(row.value.label === null && adoption.label !== undefined ? { label: adoption.label } : {}),
		parentSessionId: adoption.parentSessionId,
	});
}, Effect.asVoid);
