import { expect, it } from "@effect/vitest";
import { crewCharter } from "#charter-crew.ts";

it("omits context sections when the record has no notes or rulings", () => {
	const text = crewCharter({
		context: "Some users lose unsaved edits after restarting.",
		expectation: "A report identifying the cause and a proposed fix.",
		northStar: "Work survives application restarts.",
		pieceCharter: "Investigate lost edits after restart.",
		pieceLog: [],
		pieceTitle: "Investigate lost edits",
		rulings: [],
		voyageLog: [],
	});
	expect(text).not.toContain("# Voyage log");
	expect(text).not.toContain("# Piece log");
	expect(text).not.toContain("# Standing rulings");
});
