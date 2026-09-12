import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Effect, Option, Schema } from "effect";
export const authority = query("authority", {
	input: { agentId: AgentId, voyageId: Schema.NullOr(VoyageId), pieceId: Schema.NullOr(Schema.String) },
	output: Schema.Struct({ by: Schema.Literals(["captain", "flagship"]), rung: RulingAuthoritySchema }),
	reads: [voyageAgent, voyage],
	run: Effect.fn("rulings.authority")(function* (input, rows) {
		if (input.voyageId === null) return { by: "captain", rung: "admiral" };
		const memberships = yield* rows.voyageAgent.where({ agentId: input.agentId, voyageId: input.voyageId });
		const captain = memberships.some((member) => member.role === "captain") && input.pieceId === null;
		const sailing = yield* rows.voyage.find(input.voyageId);
		if (captain && Option.isSome(sailing) && sailing.value.kind === "flagship") return { by: "flagship", rung: "admiral" };
		return { by: "captain", rung: captain ? "flagship" : "captain" };
	}),
});
