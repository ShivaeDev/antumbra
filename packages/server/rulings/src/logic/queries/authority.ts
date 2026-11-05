import type * as Source from "@antumbra/domain-rulings/queries/authority.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const authority = Effect.fn("rulings.authority")(function* (
	input: Schema.Struct.Type<typeof Source.authority.input>,
): Effect.fn.Return<typeof Source.authority.output.Type, never, Records> {
	const rows = yield* Records;

	if (input.voyageId === null) return { by: "captain", rung: "admiral" };
	const memberships = yield* rows.voyageAgent
		.findMany({
			where: { agentId: input.agentId, voyageId: input.voyageId },
			orderBy: { field: "storage_order", direction: "asc" },
			select: voyageAgentSelection,
		})
		.pipe(Effect.orDie);
	const captain = memberships.some((member) => member.role === "captain") && input.pieceId === null;
	const sailing = yield* rows.voyage
		.findOne({ where: { id: input.voyageId }, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie);
	if (captain && Option.isSome(sailing) && sailing.value.kind === "flagship") return { by: "flagship", rung: "admiral" };
	return { by: "captain", rung: captain ? "flagship" : "captain" };
});
