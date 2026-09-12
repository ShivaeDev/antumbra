import { byPiece as artifacts } from "@antumbra/domain-artifacts/queries/by-piece.ts";
import { displayByVoyage } from "@antumbra/domain-pieces/queries/display-by-voyage.ts";
import { edges } from "@antumbra/domain-pieces/queries/edges.ts";
import { byPiece as reports } from "@antumbra/domain-reports/queries/by-piece.ts";
import { byId as rulingById } from "@antumbra/domain-rulings/queries/by-id.ts";
import { openGates } from "@antumbra/domain-rulings/queries/open-gates.ts";
import type { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option } from "effect";

export const pieceLines = Effect.fn("Agents.pieceLines")(function* (voyageId: VoyageId) {
	const live = yield* Live;
	const members = yield* live.read(displayByVoyage, { voyageId });
	const dependencies = yield* live.read(edges, { voyageId });
	const gates = yield* live.read(openGates, { pieceIds: members.map((piece) => piece.id) });
	return yield* Effect.forEach(
		members,
		Effect.fn("Agents.pieceLine")(function* (piece) {
			const landedReports = yield* live.read(reports, { pieceId: piece.id });
			const landedArtifacts = yield* live.read(artifacts, { pieceId: piece.id });
			const blocked = yield* Effect.forEach(
				gates.filter((gate) => gate.pieceId === piece.id),
				(gate) => live.read(rulingById, { id: gate.rulingId }),
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
