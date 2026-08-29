import { expect, it } from "@effect/vitest";
import { captainCharter } from "#charter-captain.ts";
import { type CrewCharter, crewCharter } from "#charter-crew.ts";
import { flagshipCharter } from "#charter-flagship.ts";

const RULING_LINES = [
	"- ruling-1 (binds the whole fleet) which reading do we trust? — trust the soundings",
	"- ruling-2 (binds one piece) may the reef be dredged? — no",
];

const CREW: CrewCharter = {
	context: "the reef is uncharted",
	expectation: "soundings are landed",
	northStar: "every shoal is known",
	pieceCharter: "sound the shallows",
	pieceLog: [],
	pieceTitle: "alpha",
	rulings: [],
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
		rulings: [],
		voyageLog: ["the eastern approach is safe"],
	});
	expect(text).toContain("# Voyage log\nthe eastern approach is safe");
	expect(text).toContain("- piece-1 alpha [done] landed: soundings");
	expect(text).toContain("- piece-2 bravo [ready] depends on piece-1");
	expect(text).toContain("`charter_piece`");
	expect(text).toContain("`launch_piece`");
	expect(text).not.toContain("`land_report`");
});

it("a flagship charter names the fleet acts beside a captain's own", () => {
	const text = flagshipCharter({
		context: "Fleet-level rulings and findings belong here.",
		northStar: "The fleet sails well.",
		pieceLines: [],
		rulings: [],
		voyageLog: [],
	});
	expect(text).toContain("`read_fleet`");
	expect(text).toContain("`charter_piece_on_voyage`");
	expect(text).toContain("`hail_captain`");
	expect(text).toContain("`charter_piece`");
	expect(
		captainCharter({
			context: "the reef is uncharted",
			northStar: "every shoal is known",
			pieceLines: [],
			rulings: [],
			voyageLog: [],
		}),
	).not.toContain("`read_fleet`");
});

it("a captain of a voyage with no pieces is told about no pieces", () => {
	expect(
		captainCharter({
			context: "the reef is uncharted",
			northStar: "every shoal is known",
			pieceLines: [],
			rulings: [],
			voyageLog: [],
		}),
	).not.toContain("# Pieces");
});

it("standing rulings are a section of both charters, one line each", () => {
	const crew = crewCharter({ ...CREW, rulings: RULING_LINES });
	expect(crew).toContain(`# Standing rulings\n${RULING_LINES.join("\n\n")}`);
	const captain = captainCharter({
		context: "the reef is uncharted",
		northStar: "every shoal is known",
		pieceLines: [],
		rulings: RULING_LINES,
		voyageLog: [],
	});
	expect(captain).toContain(`# Standing rulings\n${RULING_LINES.join("\n\n")}`);
});

it("an agent nothing binds is not told about rulings it does not have", () => {
	expect(crewCharter(CREW)).not.toContain("# Standing rulings");
	expect(
		captainCharter({
			context: "the reef is uncharted",
			northStar: "every shoal is known",
			pieceLines: [],
			rulings: [],
			voyageLog: [],
		}),
	).not.toContain("# Standing rulings");
});

it("both standing orders say to read rulings before asking for one", () => {
	for (const text of [
		crewCharter(CREW),
		captainCharter({
			context: "the reef is uncharted",
			northStar: "every shoal is known",
			pieceLines: [],
			rulings: [],
			voyageLog: [],
		}),
	]) {
		expect(text).toContain("`read_rulings`");
		expect(text).toContain("`request_ruling`");
	}
});
