import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { AgentId, voyageAgentId } from "#ids.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const authority = query("authority", {
	input: { agentId: AgentId, voyageId: Schema.NullOr(VoyageId), pieceId: Schema.NullOr(PieceId) },
	output: Schema.Struct({
		role: Schema.String,
		flagship: Schema.Boolean,
		rulesAs: Schema.Literals(["flagship", "captain"]),
		rungAsked: Schema.Literals(["admiral", "flagship", "captain"]),
	}),
	reads: [voyageAgent, voyage],
	run: Effect.fn("Agents.authority")(function* (input, rows) {
		const member = input.voyageId === null ? Option.none() : yield* rows.voyageAgent.find(voyageAgentId(input.voyageId, input.agentId));
		const role = Option.isSome(member) ? member.value.role : "";
		const isCaptain = role === "captain" && input.voyageId !== null && input.pieceId === null;
		const held = input.voyageId === null ? Option.none() : yield* rows.voyage.find(input.voyageId);
		const flagship = isCaptain && Option.isSome(held) && held.value.kind === "flagship";
		let rungAsked: "admiral" | "flagship" | "captain" = "admiral";
		if (!flagship && isCaptain) rungAsked = "flagship";
		if (!flagship && !isCaptain && input.voyageId !== null) rungAsked = "captain";
		return { role, flagship, rulesAs: flagship ? ("flagship" as const) : ("captain" as const), rungAsked };
	}),
});
