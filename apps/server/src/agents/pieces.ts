import type { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Reports } from "@antumbra/server-reports/service.ts";
import { Rulings } from "@antumbra/server-rulings/service.ts";
import { Effect, Option } from "effect";

export const pieceLines = Effect.fn("Agents.pieceLines")(function* (voyageId: VoyageId) {
	const piecesService = yield* Pieces;
	const rulingsService = yield* Rulings;

	const members = yield* piecesService.displayByVoyage({ voyageId }).pipe(Effect.orDie);
	const dependencies = yield* piecesService.edges({ voyageId }).pipe(Effect.orDie);
	const gates = yield* rulingsService.openGates({ pieceIds: members.map((piece) => piece.id) }).pipe(Effect.orDie);
	return yield* Effect.forEach(
		members,
		Effect.fn("Agents.pieceLine")(function* (piece) {
			const reportsService = yield* Reports;
			const artifactsService = yield* Artifacts;
			const rulingsService = yield* Rulings;

			const landedReports = yield* reportsService.byPiece({ pieceId: piece.id }).pipe(Effect.orDie);
			const landedArtifacts = yield* artifactsService.byPiece({ pieceId: piece.id }).pipe(Effect.orDie);
			const blocked = yield* Effect.forEach(
				gates.filter((gate) => gate.pieceId === piece.id),
				(gate) => rulingsService.byId({ id: gate.rulingId }).pipe(Effect.orDie),
			);
			const from = dependencies
				.filter((edge) => edge.to === piece.id)
				.map((edge) => edge.from)
				.sort();
			const awaiting = blocked.flatMap(Option.toArray).sort((a, b) => a.id.localeCompare(b.id));
			const titles = [...landedReports, ...landedArtifacts.current].map((outcome) => outcome.title);
			return [
				`- ${piece.id}`,
				piece.title,
				`[${piece.state}]`,
				from.length === 0 ? "" : `depends on ${from.join(", ")}`,
				awaiting.length === 0 ? "" : `awaits ruling ${awaiting.map((ruling) => `${ruling.id}: ${ruling.question}`).join("; ")}`,
				titles.length === 0 ? "" : `landed: ${titles.join("; ")}`,
			]
				.filter((part) => part !== "")
				.join(" ");
		}),
	);
});
