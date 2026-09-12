import { voyagePieceProgress } from "@antumbra/domain-voyages/rows/voyage-piece-progress.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect, Option, Schema } from "effect";
import { progressOf } from "#materializers/states.ts";
import { piece } from "#rows/piece.ts";
import { pieceAssignmentWork } from "#rows/piece-assignment-work.ts";
import { pieceEdge } from "#rows/piece-edge.ts";
import { pieceOutcome } from "#rows/piece-outcome.ts";
import { pieceProgress } from "#rows/piece-progress.ts";
import { pieceRulingGate } from "#rows/piece-ruling-gate.ts";

const samePiece = Schema.toEquivalence(pieceProgress.Row);
const sameMember = Schema.toEquivalence(voyagePieceProgress.Row);

export const pieceProgressProjection = projection("pieceProgress", {
	reads: [piece, pieceEdge, pieceOutcome, pieceAssignmentWork, pieceRulingGate],
	writes: [pieceProgress, voyagePieceProgress],
	run: Effect.fn("Pieces.projectProgress")(function* (reads, writes) {
		const pieces = yield* reads.piece.where({});
		const progress = progressOf({
			pieces,
			edges: yield* reads.pieceEdge.where({}),
			outcomes: yield* reads.pieceOutcome.where({}),
			assignments: yield* reads.pieceAssignmentWork.where({}),
			gates: yield* reads.pieceRulingGate.where({}),
		});
		for (const next of progress) {
			const current = yield* writes.pieceProgress.find(next.id);
			if (Option.isNone(current)) yield* writes.pieceProgress.insert(next);
			else if (!samePiece(current.value, next)) yield* writes.pieceProgress.update(next.id, next);
			const source = pieces.find((piece) => piece.id === next.id);
			const moments = [source?.launchedAt, source?.parkedAt].filter((at): at is string => typeof at === "string");
			const member = {
				id: next.id,
				voyageId: next.voyageId,
				state: next.state,
				concluded: next.concluded,
				lastStirredAt: moments.toSorted().at(-1) ?? null,
			};
			const standing = yield* writes.voyagePieceProgress.find(next.id);
			if (Option.isNone(standing)) yield* writes.voyagePieceProgress.insert(member);
			else if (!sameMember(standing.value, member)) yield* writes.voyagePieceProgress.update(member.id, member);
		}
	}),
});
