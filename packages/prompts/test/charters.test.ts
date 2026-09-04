import { expect, it } from "@effect/vitest";
import { captainCharter } from "#charter-captain.ts";
import { type CrewCharter, crewCharter } from "#charter-crew.ts";
import { flagshipCharter } from "#charter-flagship.ts";
import { wakeWords } from "#wake.ts";

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
	expect(text).toContain("Proposed further work belongs in your report for the captain to charter");
	expect(text).toContain("completion is derived from landed and pending outcomes");
	expect(text).toContain("An open change is still pending");
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
	expect(written).toContain("# Voyage log\nthe eastern approach is safe\n\nthe swell backs west");
	expect(written).toContain("# Piece log\nthe last hand reached the reef edge");
});

it("a captain charter lists the pieces and the captain standing order", () => {
	const text = captainCharter({
		context: "the reef is uncharted",
		northStar: "every shoal is known",
		pieceLines: ["- piece-1 alpha [done] landed: soundings", "- piece-2 bravo [ready] depends on piece-1"],
		rulings: [],
		voyageLog: ["the eastern approach is safe"],
	});
	expect(text).toContain("# Voyage log\nthe eastern approach is safe");
	expect(text).toContain("- piece-1 alpha [done] landed: soundings");
	expect(text).toContain("- piece-2 bravo [ready] depends on piece-1");
	expect(text).toContain("Read the crew's findings before deciding the next work");
	expect(text).toContain("revise the course when evidence changes it");
	expect(text).toContain("when the voyage needs no further decision or action from you");
});

it("a flagship charter names its responsibility to the admiral and the other captains", () => {
	const text = flagshipCharter({
		context: "Fleet-level rulings and findings belong here.",
		northStar: "The fleet sails well.",
		pieceLines: [],
		rulings: [],
		voyageLog: ["why the fleet changed course"],
	});
	expect(text).toContain("the admiral's point of contact");
	expect(text).toContain("Each voyage's captain remains accountable for its work");
	expect(text).toContain("# Fleet log\nwhy the fleet changed course");
	expect(text).toContain("when the voyage needs no further decision or action from you");
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

it("every generated role receives conduct without tool inventories", () => {
	const captain = {
		context: "the reef is uncharted",
		northStar: "every shoal is known",
		pieceLines: [],
		rulings: [],
		voyageLog: [],
	};
	for (const text of [crewCharter(CREW), captainCharter(captain), flagshipCharter(captain)]) {
		expect(text).toContain("standing rulings that bind your work in the light of their questions and context");
		expect(text).toContain("what you recommend and why, and which work needs the answer");
		expect(text).toContain("in the rough register");
		expect(text).toContain("Leave out what the durable record already says");
		expect(text).toContain("safe boundary and wake you later with your identity and responsibility intact");
		expect(text).toContain("Treat the admiral's steering as direction for the work already in hand");
		expect(text).not.toMatch(/`[a-z]+_[a-z_]+`/);
	}
});

it("a wake asks the same Agent to recover current context before continuing", () => {
	expect(wakeWords).toContain("the same Agent");
	expect(wakeWords).toContain("current work, standing rulings and board notes before continuing");
	expect(wakeWords).toContain("the admiral's latest direction");
});
