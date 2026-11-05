import type { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Reports } from "@antumbra/server-reports/service.ts";
import { Rulings } from "@antumbra/server-rulings/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Data, Effect } from "effect";
import { pace } from "#tools/voyages/pace.ts";

class VoyageNotFound extends Data.TaggedError("VoyageNotFound")<{ readonly voyageId: VoyageId }> {}

export const readVoyageView = Effect.fn("VoyageTools.read")(function* (id: VoyageId) {
	const voyagesService = yield* Voyages;
	const piecesService = yield* Pieces;
	const changesService = yield* Changes;
	const agentsService = yield* Agents;

	const voyage = yield* voyagesService.byId({ id }).pipe(Effect.orDie);
	if (voyage === null) return yield* Effect.fail(new VoyageNotFound({ voyageId: id }));
	const members = yield* piecesService.displayByVoyage({ voyageId: id }).pipe(Effect.orDie);
	const changeRows = yield* changesService.all({}).pipe(Effect.orDie);
	const changeLinks = yield* changesService.links({}).pipe(Effect.orDie);
	const pieces = yield* Effect.forEach(members, (piece) =>
		Effect.gen(function* () {
			const agentsService = yield* Agents;
			const piecesService = yield* Pieces;
			const rulingsService = yield* Rulings;
			const reportsService = yield* Reports;
			const artifactsService = yield* Artifacts;

			const attached = new Set(changeLinks.filter((link) => link.pieceId === piece.id).map((link) => link.changeId));
			return {
				...piece,
				agents: yield* agentsService.byPiece({ pieceId: piece.id }).pipe(Effect.orDie),
				dependencies: yield* piecesService.dependencies({ id: piece.id }).pipe(Effect.orDie),
				gates: yield* rulingsService.openGates({ pieceIds: [piece.id] }).pipe(Effect.orDie),
				reports: yield* reportsService.byPiece({ pieceId: piece.id }).pipe(Effect.orDie),
				artifacts: (yield* artifactsService.byPiece({ pieceId: piece.id }).pipe(Effect.orDie)).current,
				changes: changeRows.filter((change) => attached.has(change.id)),
			};
		}),
	);
	return {
		voyage,
		pieces,
		progress: yield* voyagesService.progress({ id }).pipe(Effect.orDie),
		captain: yield* agentsService.captain({ voyageId: id }).pipe(Effect.orDie),
		pace: yield* pace(id),
	};
});

export type VoyageReading = Effect.Success<ReturnType<typeof readVoyageView>>;
