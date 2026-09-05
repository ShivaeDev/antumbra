import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

export const nameNode = Effect.fn("SessionTreeRows.nameNode")(
	function* (sessionId: string, label: string) {
		const db = yield* Database;
		const row = yield* db.AgentSession.where({ id: sessionId }).first();
		if (Option.isNone(row) || row.value.label !== null) {
			return;
		}
		yield* db.AgentSession.where({ id: sessionId, label: null }).update({
			label,
		});
	},
	(effect, sessionId) =>
		effect.pipe(Effect.catchCause((cause) => Effect.logError("a subsession label could not be filled in", { sessionId }, cause))),
);
