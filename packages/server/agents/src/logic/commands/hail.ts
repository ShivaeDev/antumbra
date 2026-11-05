import type * as Source from "@antumbra/domain-agents/commands/hail.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
import { captain } from "#logic/queries/captain.ts";

export const hail = Effect.fn("Agents.hail")(function* (
	input: typeof Source.hail.Input.Type,
	reject: typeof Source.hail.reject,
): Effect.fn.Return<typeof Source.hail.emits.Payload.Type, RejectedBy<typeof Source.hail.rejections>, Records> {
	const rows = yield* Records;

	const sailing = Option.getOrNull(
		yield* rows.voyage
			.findOne({ where: { id: input.voyageId }, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
			.pipe(Effect.orDie),
	);
	if (sailing === null) return yield* reject.UnknownVoyage({ id: input.voyageId });
	const ids = identity(input.requestId);
	const current = yield* captain({ voyageId: input.voyageId });
	if (current?.status === "spawning") return yield* reject.CaptainAlreadyHailed({ agentId: current.id });
	let wakeSessionId: null | typeof session.Row.Type.id = null;
	if (current?.status === "alive") {
		const roots = yield* rows.session
			.findMany({
				where: { agentId: current.id, parentSessionId: null, status: "open" },
				orderBy: { field: "storage_order", direction: "asc" },
				select: sessionSelection,
			})
			.pipe(Effect.orDie);
		const root = roots.find((held) => held.id === current.currentSessionId);
		if (root === undefined) return yield* reject.CaptainSessionUnavailable({ agentId: current.id });
		if (root.stoppedAt !== null && input.by === "agent") return yield* reject.CaptainStopped({ agentId: current.id });
		if (sailing.quietedAt !== null && input.by === "agent") return yield* reject.VoyageQuiet({ agentId: current.id });
		wakeSessionId = root.id;
	} else if (
		Option.isSome(
			yield* rows.agent
				.findOne({ where: { id: ids.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
				.pipe(Effect.orDie),
		)
	)
		return yield* reject.AgentExists({ id: ids.agentId });
	return {
		wakeSessionId,
		id: ids.birthId,
		source: input.by === "agent" ? ("hail" as const) : ("direct" as const),
		agentId: ids.agentId,
		sessionId: ids.sessionId,
		voyageId: input.voyageId,
		pieceId: null,
		backend: null,
		model: null,
		effort: null,
		role: "captain",
	};
});
