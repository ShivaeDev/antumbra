import { byPiece as agentsByPiece } from "@antumbra/domain-agents/queries/by-piece.ts";
import { captain } from "@antumbra/domain-agents/queries/captain.ts";
import { byPiece as artifactsByPiece } from "@antumbra/domain-artifacts/queries/by-piece.ts";
import { all as changes } from "@antumbra/domain-changes/queries/all.ts";
import { links } from "@antumbra/domain-changes/queries/links.ts";
import { dependencies } from "@antumbra/domain-pieces/queries/dependencies.ts";
import { displayByVoyage } from "@antumbra/domain-pieces/queries/display-by-voyage.ts";
import { byPiece as reportsByPiece } from "@antumbra/domain-reports/queries/by-piece.ts";
import { openGates } from "@antumbra/domain-rulings/queries/open-gates.ts";
import type { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import { progress } from "@antumbra/domain-voyages/queries/progress.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Data, Effect } from "effect";
import { pace } from "#tools/voyages/pace.ts";

class VoyageNotFound extends Data.TaggedError("VoyageNotFound")<{ readonly voyageId: VoyageId }> {}

export const readVoyageView = Effect.fn("VoyageTools.read")(function* (id: VoyageId) {
	const live = yield* Live;
	const voyage = yield* live.read(byId, { id });
	if (voyage === null) return yield* Effect.fail(new VoyageNotFound({ voyageId: id }));
	const members = yield* live.read(displayByVoyage, { voyageId: id });
	const changeRows = yield* live.read(changes, {});
	const changeLinks = yield* live.read(links, {});
	const pieces = yield* Effect.forEach(members, (piece) =>
		Effect.gen(function* () {
			const attached = new Set(changeLinks.filter((link) => link.pieceId === piece.id).map((link) => link.changeId));
			return {
				...piece,
				agents: yield* live.read(agentsByPiece, { pieceId: piece.id }),
				dependencies: yield* live.read(dependencies, { id: piece.id }),
				gates: yield* live.read(openGates, { pieceIds: [piece.id] }),
				reports: yield* live.read(reportsByPiece, { pieceId: piece.id }),
				artifacts: (yield* live.read(artifactsByPiece, { pieceId: piece.id })).current,
				changes: changeRows.filter((change) => attached.has(change.id)),
			};
		}),
	);
	return {
		voyage,
		pieces,
		progress: yield* live.read(progress, { id }),
		captain: yield* live.read(captain, { voyageId: id }),
		pace: yield* pace(id),
	};
});

export type VoyageReading = Effect.Success<ReturnType<typeof readVoyageView>>;
