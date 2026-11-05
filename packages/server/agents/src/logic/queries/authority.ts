import type * as Source from "@antumbra/domain-agents/queries/authority.ts";
import { voyageAgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const authority = Effect.fn("Agents.authority")(function* (
	input: Schema.Struct.Type<typeof Source.authority.input>,
): Effect.fn.Return<typeof Source.authority.output.Type, never, Records> {
	const rows = yield* Records;

	const member =
		input.voyageId === null
			? Option.none()
			: yield* rows.voyageAgent
					.findOne({
						where: { id: voyageAgentId(input.voyageId, input.agentId) },
						orderBy: { field: "storage_order", direction: "asc" },
						select: voyageAgentSelection,
					})
					.pipe(Effect.orDie);
	const role = Option.isSome(member) ? member.value.role : "";
	const isCaptain = role === "captain" && input.voyageId !== null && input.pieceId === null;
	const held =
		input.voyageId === null
			? Option.none()
			: yield* rows.voyage
					.findOne({ where: { id: input.voyageId }, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
					.pipe(Effect.orDie);
	const flagship = isCaptain && Option.isSome(held) && held.value.kind === "flagship";
	let rungAsked: "admiral" | "flagship" | "captain" = "admiral";
	if (!flagship && isCaptain) rungAsked = "flagship";
	if (!flagship && !isCaptain && input.voyageId !== null) rungAsked = "captain";
	return { role, flagship, rulesAs: flagship ? ("flagship" as const) : ("captain" as const), rungAsked };
});
