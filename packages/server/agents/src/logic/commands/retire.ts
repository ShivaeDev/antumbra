import type * as Source from "@antumbra/domain-agents/commands/retire.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const retire = Effect.fn("Agents.retire")(function* (
	input: typeof Source.retire.Input.Type,
	reject: typeof Source.retire.reject,
): Effect.fn.Return<typeof Source.retire.emits.Payload.Type, RejectedBy<typeof Source.retire.rejections>, Records> {
	const rows = yield* Records;

	if (
		Option.isNone(
			yield* rows.agent
				.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
				.pipe(Effect.orDie),
		)
	)
		return yield* reject.Unknown({ id: input.id });
	const roots = yield* rows.session
		.findMany({
			where: { agentId: input.id, parentSessionId: null, status: "open" },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionSelection,
		})
		.pipe(Effect.orDie);
	const working = roots.find((root) => root.attached && root.executionStatus === "active");
	if (working !== undefined) return yield* reject.Working({ agentId: input.id, sessionId: working.id });
	return { id: input.id };
});
