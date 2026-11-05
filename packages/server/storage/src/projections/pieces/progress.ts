import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { voyagePieceProgress } from "@antumbra/domain-voyages/rows/voyage-piece-progress.ts";
import { progressOf } from "@antumbra/platform-vocabulary/piece-progress.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceAssignmentWorkSelection } from "@antumbra/server-storage/records/piece-assignment-work.ts";
import { selection as pieceEdgeSelection } from "@antumbra/server-storage/records/piece-edge.ts";
import { selection as pieceOutcomeSelection } from "@antumbra/server-storage/records/piece-outcome.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as pieceRulingGateSelection } from "@antumbra/server-storage/records/piece-ruling-gate.ts";
import { selection as voyagePieceProgressSelection } from "@antumbra/server-storage/records/voyage-piece-progress.ts";
import { Effect, Option, Schema } from "effect";
import { Records } from "#records.ts";

const samePiece = Schema.toEquivalence(pieceProgress.Row);
const sameMember = Schema.toEquivalence(voyagePieceProgress.Row);

export const pieceProgressProjection = Effect.fn("Pieces.projectProgress")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const pieces = yield* reads.piece
		.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
		.pipe(Effect.orDie);
	const progress = progressOf({
		pieces,
		edges: yield* reads.pieceEdge.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceEdgeSelection }).pipe(Effect.orDie),
		outcomes: yield* reads.pieceOutcome
			.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceOutcomeSelection })
			.pipe(Effect.orDie),
		assignments: yield* reads.pieceAssignmentWork
			.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceAssignmentWorkSelection })
			.pipe(Effect.orDie),
		gates: yield* reads.pieceRulingGate
			.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceRulingGateSelection })
			.pipe(Effect.orDie),
	});
	for (const next of progress) {
		const current = yield* writes.pieceProgress
			.findOne({ where: { id: next.id }, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(current)) yield* writes.pieceProgress.insertVoid(next).pipe(Effect.orDie);
		else if (!samePiece(current.value, next)) yield* writes.pieceProgress.updateVoid({ ...next, id: next.id }).pipe(Effect.orDie);
		const source = pieces.find((piece) => piece.id === next.id);
		const moments = [source?.launchedAt, source?.parkedAt].filter((at): at is string => typeof at === "string");
		const member = {
			id: next.id,
			voyageId: next.voyageId,
			state: next.state,
			concluded: next.concluded,
			lastStirredAt: moments.toSorted().at(-1) ?? null,
		};
		const standing = yield* writes.voyagePieceProgress
			.findOne({ where: { id: next.id }, orderBy: { field: "id", direction: "asc" }, select: voyagePieceProgressSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(standing)) yield* writes.voyagePieceProgress.insertVoid(member).pipe(Effect.orDie);
		else if (!sameMember(standing.value, member)) yield* writes.voyagePieceProgress.updateVoid({ ...member, id: member.id }).pipe(Effect.orDie);
	}
});
