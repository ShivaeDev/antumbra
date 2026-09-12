import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect, Option, Schema } from "effect";
import { voyage } from "#rows/voyage.ts";
import { voyageCaptainWork } from "#rows/voyage-captain-work.ts";
import { voyagePieceProgress } from "#rows/voyage-piece-progress.ts";
import { voyageProgress } from "#rows/voyage-progress.ts";

const sameProgress = Schema.toEquivalence(voyageProgress.Row);

export const voyageProgressProjection = projection("voyageProgress", {
	reads: [voyage, voyagePieceProgress, voyageCaptainWork],
	writes: [voyageProgress],
	run: Effect.fn("Voyages.projectProgress")(function* (reads, writes) {
		const voyages = yield* reads.voyage.where({});
		const members = Map.groupBy(yield* reads.voyagePieceProgress.where({}), (piece) => piece.voyageId);
		const working = new Set((yield* reads.voyageCaptainWork.where({ working: true })).map((captain) => captain.voyageId));
		for (const voyage of voyages) {
			const pieces = members.get(voyage.id) ?? [];
			const counts = { abandoned: 0, active: 0, blocked: 0, done: 0, held: 0, landing: 0, parked: 0, ready: 0 };
			for (const piece of pieces) counts[piece.state] += 1;
			const next = {
				id: voyage.id,
				counts,
				state: counts.active > 0 || working.has(voyage.id) ? ("underWay" as const) : ("quiet" as const),
				concluded: pieces.length > 0 && pieces.every((piece) => piece.concluded),
			};
			const current = yield* writes.voyageProgress.find(voyage.id);
			if (Option.isNone(current)) yield* writes.voyageProgress.insert(next);
			else if (!sameProgress(current.value, next)) yield* writes.voyageProgress.update(next.id, next);
		}
	}),
});
