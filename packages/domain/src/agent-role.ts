import { Database } from "@antumbra/persistence";
import type { AgentRole } from "@antumbra/vocabulary/agent-role";
import { Effect, Option } from "effect";

export const captainRoleOf = (kind: string): AgentRole => (kind === "flagship" ? "flagship" : "captain");

export const makeCaptainRoleOfVoyage = Effect.gen(function* () {
	const db = yield* Database;
	return (voyageId: string) =>
		db.Voyage.where({ id: voyageId })
			.first()
			.pipe(
				Effect.map(
					Option.match({
						onNone: (): AgentRole => "captain",
						onSome: (voyage) => captainRoleOf(voyage.kind),
					}),
				),
			);
});
