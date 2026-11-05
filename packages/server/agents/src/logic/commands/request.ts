import type * as Source from "@antumbra/domain-agents/commands/request.ts";
import { piece as pieceRecordSchema } from "@antumbra/domain-pieces/rows/piece.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { selection as pieceAssignmentWorkSelection } from "@antumbra/server-storage/records/piece-assignment-work.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

export const request = Effect.fn("Agents.request")(function* (
	input: typeof Source.request.Input.Type,
	reject: typeof Source.request.reject,
): Effect.fn.Return<typeof Source.request.emits.Payload.Type, RejectedBy<typeof Source.request.rejections>, Records> {
	const rows = yield* Records;

	const ids = identity(input.requestId);
	if (
		yield* rows.agent.count({ where: { id: ids.agentId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		return yield* reject.AgentExists({ id: ids.agentId });
	if (
		!(yield* rows.voyage.count({ where: { id: input.voyageId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.Unknown({ kind: "voyage", id: input.voyageId });
	if (
		!(yield* rows.piece.count({ where: { id: input.pieceId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.Unknown({ kind: "piece", id: input.pieceId });
	const held = yield* rows.piece.findById(input.pieceId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(pieceRecordSchema.Row)), Effect.orDie);
	if (held.verdict === "abandoned") return yield* reject.PieceAbandoned({ pieceId: held.id });
	const working = (yield* rows.pieceAssignmentWork
		.findMany({ where: { pieceId: held.id, working: true }, orderBy: { field: "id", direction: "asc" }, select: pieceAssignmentWorkSelection })
		.pipe(Effect.orDie))[0];
	if (working !== undefined) return yield* reject.PieceAlreadyCrewed({ pieceId: held.id, agentId: working.agentId });
	return {
		wakeSessionId: null,
		id: ids.birthId,
		source: "dispatch" as const,
		agentId: ids.agentId,
		sessionId: ids.sessionId,
		voyageId: input.voyageId,
		pieceId: input.pieceId,
		backend: null,
		model: null,
		effort: null,
		role: input.role,
	};
});
