import { charterText, logSection, section } from "#charter-sections.ts";
import { pieceLineWithOutcomes } from "#piece-line.ts";
import type { PieceView } from "#piece-view.ts";
import type { VoyageRow } from "#voyage-rows.ts";

export interface CaptainLogs {
	readonly voyageSmoothLog: ReadonlyArray<string>;
}

// why: the captain's tools are its authority, so the order names them and
// says what each one means for the voyage — including that launching is a
// release into the pool and not a wait.
const CAPTAIN_STANDING_ORDER = [
	"- You charter the work: `charter_piece` states a title, a charter, the outcome you expect, the role that suits it, and the pieces it waits on. Workers report; captains charter.",
	"- `launch_piece` releases a piece into the pool. It is dispatched when its dependencies are done and there is room in the fleet — you do not wait for it, and a launched chain finishes on its own.",
	"- `read_voyage` shows what has landed. `park_piece` pulls a piece back out of the pool, `unpark_piece` returns it, and `rewire_piece` changes what a piece waits on.",
	"- `read_report` gives you a landed report in full, by the id `read_voyage` shows beside it. Workers report; captains read what they said.",
	"- `write_board` in the smooth register is how you talk to your successor: write what the next captain of this voyage must know, and nothing the record already holds. `read_board` shows what earlier captains left.",
	"- Call `stand_down` when the voyage is quiet, or when there is nothing for you to do until something lands. You are hailed again when you are wanted.",
].join("\n");

// why: a captain is told the same three things every session — where the
// voyage is going, what its board says, and where its pieces stand — because
// its session is mortal and the voyage is not.
export const composeCaptainCharter = (
	voyage: VoyageRow,
	pieces: ReadonlyArray<PieceView>,
	logs: CaptainLogs,
): string =>
	charterText([
		section("North star", voyage.northStar),
		section("Context", voyage.context),
		logSection("Voyage log", logs.voyageSmoothLog),
		section("Pieces", pieces.map(pieceLineWithOutcomes).join("\n")),
		section("Standing orders", CAPTAIN_STANDING_ORDER),
	]);
