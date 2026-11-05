import type * as Source from "@antumbra/domain-agents/commands/smooth.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
import { smoother } from "#logic/queries/smoother.ts";

export const smooth = Effect.fn("Agents.smooth")(function* (
	input: typeof Source.smooth.Input.Type,
	reject: typeof Source.smooth.reject,
): Effect.fn.Return<typeof Source.smooth.emits.Payload.Type, RejectedBy<typeof Source.smooth.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.voyage.count({ where: { id: input.voyageId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownVoyage({ id: input.voyageId });
	const selected = yield* smoother({ voyageId: input.voyageId });
	const existing = yield* rows.agent
		.findOne({ where: { id: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie);
	if ((selected !== null && selected.id !== input.agentId) || (selected === null && Option.isSome(existing)))
		return yield* reject.WrongAgent({ id: input.agentId });
	if (
		(yield* rows.session.count({ where: { id: input.sessionId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)) ||
		(yield* rows.birth
			.findMany({ where: { sessionId: input.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
			.pipe(Effect.orDie)).length > 0
	)
		return yield* reject.SessionExists({ id: input.sessionId });
	if (
		(yield* rows.session
			.findMany({
				where: { agentId: input.agentId, status: "open" },
				orderBy: { field: "storage_order", direction: "asc" },
				select: sessionSelection,
			})
			.pipe(Effect.orDie)).length > 0 ||
		(yield* rows.birth
			.findMany({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
			.pipe(Effect.orDie)).some((value) => ["requested", "admitted", "running", "waiting"].includes(value.status))
	)
		return yield* reject.Busy({ agentId: input.agentId });
	return {
		id: identity(input.requestId).birthId,
		agentId: input.agentId,
		sessionId: input.sessionId,
		voyageId: input.voyageId,
		createsAgent: Option.isNone(existing),
		cwd: input.cwd,
	};
});
