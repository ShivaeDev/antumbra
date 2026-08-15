import { charterText, logSection, section } from "#charter-sections.ts";
import type { PieceRow, VoyageRow } from "#voyage-rows.ts";

export interface CrewLogs {
	readonly pieceSmoothLog: ReadonlyArray<string>;
	readonly voyageSmoothLog: ReadonlyArray<string>;
}

// why: the standing order names its tools, because a crew member that has to
// infer how to act reports into the void. Chartering is absent from the set
// and absent from the order: workers report, captains charter.
const CREW_STANDING_ORDER = [
	"- Land what you produce against your piece: `land_report` for prose another agent will read, `land_artifact` for something a person should look at. A piece is done when its outcomes land; nothing else marks it.",
	"- Write anything your successor must know to your piece board with `write_board` — the smooth register for what stays true, the rough register for scratch. `read_board` shows what earlier hands left.",
	"- Call `stand_down` once everything is landed. Nothing you do after that call is seen.",
	"- You charter nothing. If the voyage needs more pieces, say so in your report.",
].join("\n");

// why: the charter is the only thing crew is told at birth, and it is read by
// a model, not parsed — so it stays plain prose in a fixed order: where the
// voyage is going, what surrounds it, the piece this agent answers to, what
// earlier hands left behind, and how to act.
export const composeCrewCharter = (
	voyage: VoyageRow,
	piece: PieceRow,
	logs: CrewLogs,
): string =>
	charterText([
		section("North star", voyage.northStar),
		section("Context", voyage.context),
		section(`Your piece: ${piece.title}`, piece.charter),
		section("Expected outcome", piece.expectation),
		logSection("Voyage log", logs.voyageSmoothLog),
		logSection("Piece log", logs.pieceSmoothLog),
		section("Standing orders", CREW_STANDING_ORDER),
	]);
