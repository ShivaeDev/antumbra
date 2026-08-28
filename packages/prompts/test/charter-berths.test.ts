import { expect, it } from "@effect/vitest";
import { type BerthedCharter, berthedCharter } from "#charter-berths.ts";
import { captainCharter } from "#charter-captain.ts";
import { crewCharter } from "#charter-crew.ts";

const MOORAGE = "/moorage/a1b2c3d4";

const LEAD = `Your working directory is your moorage, ${MOORAGE}. Every repository below is a folder directly inside it, and everything else you write — notes, scratch, files you mean to land — belongs in the moorage itself, never above it.`;

const CREW_ORDER =
	"- Work inside a berth's folder, never in the moorage root itself and never in a mirror, and give `open_change`, `submit_change` and `adopt_change` the repo name exactly as the Berths section spells it — not the folder's name.";

const CAPTAIN_ORDER =
	"- The repos your crew is berthed in are the ones under Berths, spelled there as the registry knows them; a piece charter naming one spells it the same way.";

type Berth = BerthedCharter["berths"][number];

const antumbra: Berth = {
	branch: "work/a1b2c3d4/antumbra",
	folder: "./antumbra",
	repo: "Antumbra",
};

const charts: Berth = {
	branch: "work/a1b2c3d4/reef-charts",
	folder: "./reef-charts",
	repo: "Reef-Charts",
};

const CREW = crewCharter({
	context: "the reef is uncharted",
	expectation: "soundings are landed",
	northStar: "every shoal is known",
	pieceCharter: "sound the shallows",
	pieceLog: [],
	pieceTitle: "alpha",
	rulings: [],
	voyageLog: [],
});

const CAPTAIN = captainCharter({
	context: "the reef is uncharted",
	northStar: "every shoal is known",
	pieceLines: [],
	rulings: [],
	voyageLog: [],
});

const berthedCrew = (berths: ReadonlyArray<Berth>) =>
	berthedCharter({
		berths,
		charter: CREW,
		moorageRoot: MOORAGE,
		role: "crew",
	});

const berthedCaptain = (berths: ReadonlyArray<Berth>) =>
	berthedCharter({
		berths,
		charter: CAPTAIN,
		moorageRoot: MOORAGE,
		role: "captain",
	});

it("an agent with no berths is told of none and ordered about none", () => {
	expect(berthedCrew([])).toBe(CREW);
	expect(berthedCrew([])).not.toContain("# Berths");
	expect(berthedCaptain([])).not.toContain("# Berths");
});

it("the moorage the agent stands in leads the berths it holds", () => {
	expect(berthedCrew([antumbra])).toContain(
		`# Berths\n${LEAD}\nAntumbra — ./antumbra — branch work/a1b2c3d4/antumbra`,
	);
});

it("the absolute moorage is stated once and every berth is relative", () => {
	const text = berthedCrew([antumbra, charts]);
	expect(text.split(MOORAGE)).toHaveLength(2);
	expect(text).not.toContain(`${MOORAGE}/antumbra`);
});

it("the moorage is named as the place scratch belongs, not only berths", () => {
	expect(berthedCrew([antumbra])).toContain(
		"belongs in the moorage itself, never above it",
	);
});

it("the registry name is printed, never the berth folder's slug", () => {
	const text = berthedCrew([antumbra]);
	expect(text).toContain("\nAntumbra — ./antumbra");
	expect(text).not.toContain("\nantumbra —");
});

it("every berth is a line of its own", () => {
	expect(berthedCrew([antumbra, charts])).toContain(
		[
			LEAD,
			"Antumbra — ./antumbra — branch work/a1b2c3d4/antumbra",
			"Reef-Charts — ./reef-charts — branch work/a1b2c3d4/reef-charts",
		].join("\n"),
	);
});

it("the berth order joins the standing orders and precedes the berths", () => {
	const text = berthedCrew([antumbra]);
	expect(text.indexOf("`stand_down`")).toBeLessThan(text.indexOf(CREW_ORDER));
	expect(text.indexOf(CREW_ORDER)).toBeLessThan(text.indexOf("# Berths"));
	expect(text).toContain("`open_change`");
});

it("a captain is told the same berths without crew tools it does not hold", () => {
	const text = berthedCaptain([antumbra]);
	expect(text).toContain(`# Berths\n${LEAD}\nAntumbra — ./antumbra`);
	expect(text).toContain(CAPTAIN_ORDER);
	expect(text).not.toContain("`open_change`");
});
