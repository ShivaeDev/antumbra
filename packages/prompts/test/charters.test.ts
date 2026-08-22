import { expect, it } from "@effect/vitest";
import { captainCharter } from "#charter-captain.ts";
import { type CrewCharter, crewCharter } from "#charter-crew.ts";

const CREW: CrewCharter = {
	context: "the reef is uncharted",
	expectation: "soundings are landed",
	northStar: "every shoal is known",
	pieceCharter: "sound the shallows",
	pieceLog: [],
	pieceTitle: "alpha",
	voyageLog: [],
};

it("a crew charter carries the voyage, the piece and the crew standing order", () => {
	const text = crewCharter(CREW);
	expect(text).toContain("# North star\nevery shoal is known");
	expect(text).toContain("# Your piece: alpha\nsound the shallows");
	expect(text).toContain("# Expected outcome\nsoundings are landed");
	expect(text).toContain("`land_report`");
	expect(text).toContain("`stand_down`");
	expect(text).not.toContain("`charter_piece`");
});

it("an empty log is left out of a charter rather than titled", () => {
	const bare = crewCharter(CREW);
	expect(bare).not.toContain("# Voyage log");
	expect(bare).not.toContain("# Piece log");

	const written = crewCharter({
		...CREW,
		pieceLog: ["the last hand reached the reef edge"],
		voyageLog: ["the eastern approach is safe", "the swell backs west"],
	});
	expect(written).toContain(
		"# Voyage log\nthe eastern approach is safe\n\nthe swell backs west",
	);
	expect(written).toContain("# Piece log\nthe last hand reached the reef edge");
});

it("a captain charter lists the pieces and the captain standing order", () => {
	const text = captainCharter({
		context: "the reef is uncharted",
		northStar: "every shoal is known",
		pieceLines: [
			"- piece-1 alpha [done] landed: soundings",
			"- piece-2 bravo [ready] depends on piece-1",
		],
		voyageLog: ["the eastern approach is safe"],
	});
	expect(text).toContain("# Voyage log\nthe eastern approach is safe");
	expect(text).toContain("- piece-1 alpha [done] landed: soundings");
	expect(text).toContain("- piece-2 bravo [ready] depends on piece-1");
	expect(text).toContain("`charter_piece`");
	expect(text).toContain("`launch_piece`");
	expect(text).not.toContain("`land_report`");
});

it("a captain of a voyage with no pieces is told about no pieces", () => {
	expect(
		captainCharter({
			context: "the reef is uncharted",
			northStar: "every shoal is known",
			pieceLines: [],
			voyageLog: [],
		}),
	).not.toContain("# Pieces");
});
