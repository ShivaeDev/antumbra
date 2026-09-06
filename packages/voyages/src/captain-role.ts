import { Database } from "@antumbra/persistence";
import type { AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { Effect, Option } from "effect";

export const captainRoleOf = (kind: string): AgentRole => (kind === "flagship" ? "flagship" : "captain");

export const captainRole = Effect.fn("Voyages.captainRole")(function* (voyageId: string) {
	const db = yield* Database;
	const voyage = yield* db.Voyage.where({ id: voyageId }).first();
	return Option.match(voyage, { onNone: (): AgentRole => "captain", onSome: (row) => captainRoleOf(row.kind) });
});
