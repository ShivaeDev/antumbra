import type { AgentId } from "@antumbra/domain-agents/ids.ts";
import { pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { digest } from "@antumbra/domain-boards/queries/digest.ts";
import type { piece as pieceRow } from "@antumbra/domain-pieces/rows/piece.ts";
import { binding } from "@antumbra/domain-rulings/queries/binding.ts";
import type { voyage as voyageRow } from "@antumbra/domain-voyages/rows/voyage.ts";
import { captainCharter } from "@antumbra/platform-prompts/charter-captain.ts";
import { crewCharter } from "@antumbra/platform-prompts/charter-crew.ts";
import { flagshipCharter } from "@antumbra/platform-prompts/charter-flagship.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { pieceLines } from "#starts/pieces.ts";
import { rulingLine } from "#starts/rulings.ts";

export const charter = Effect.fn("Starts.charter")(function* (
	agentId: AgentId,
	voyage: typeof voyageRow.Row.Type,
	piece: typeof pieceRow.Row.Type | null,
) {
	const live = yield* Live;
	const voyageLog = (yield* live.read(digest, { board: voyageBoard(voyage.id) })).map((entry) => entry.body);
	const subjects = [
		{ kind: "agent" as const, id: agentId },
		{ kind: "voyage" as const, id: voyage.id },
	];
	const rulings = (yield* live.read(binding, { subjects: piece === null ? subjects : [...subjects, { kind: "piece", id: piece.id }] })).map(
		rulingLine,
	);
	if (piece !== null)
		return crewCharter({
			context: voyage.context,
			expectation: piece.expectation,
			northStar: voyage.northStar,
			pieceCharter: piece.charter,
			pieceTitle: piece.title,
			voyageLog,
			rulings,
			pieceLog: (yield* live.read(digest, { board: pieceBoard(piece.id) })).map((entry) => entry.body),
		});
	const input = { context: voyage.context, northStar: voyage.northStar, voyageLog, rulings, pieceLines: yield* pieceLines(voyage.id) };
	return voyage.kind === "flagship" ? flagshipCharter(input) : captainCharter(input);
});
