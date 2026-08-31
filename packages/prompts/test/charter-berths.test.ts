import { expect, it } from "@effect/vitest";
import { type BerthedCharter, berthedCharter } from "#charter-berths.ts";

const MOORAGE = "/moorage/a1b2c3d4";
const CHARTER = "Sound the shallows.";

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

const berthed = (role: "captain" | "crew", berths: ReadonlyArray<Berth>) =>
	berthedCharter({
		berths,
		charter: CHARTER,
		moorageRoot: MOORAGE,
		role,
	});

it("an agent with no berths is told of none and ordered about none", () => {
	expect(berthed("crew", [])).toBe(CHARTER);
	expect(berthed("captain", [])).toBe(CHARTER);
});

it("places each named berth under the crew's moorage and orders", () => {
	const text = berthed("crew", [antumbra, charts]);
	expect(text).toContain(`# Berths\nYour working directory is your moorage, ${MOORAGE}.`);
	expect(text).toContain("Antumbra — ./antumbra — branch work/a1b2c3d4/antumbra");
	expect(text).toContain("Reef-Charts — ./reef-charts — branch work/a1b2c3d4/reef-charts");
	expect(text.split(MOORAGE)).toHaveLength(2);
	expect(text.indexOf("`open_change`")).toBeLessThan(text.indexOf("# Berths"));
});

it("a captain is told the same berths without crew tools it does not hold", () => {
	const text = berthed("captain", [antumbra]);
	expect(text).toContain(`# Berths\nYour working directory is your moorage, ${MOORAGE}.`);
	expect(text).toContain("Antumbra — ./antumbra — branch work/a1b2c3d4/antumbra");
	expect(text).toContain("repos your crew is berthed in");
	expect(text).not.toContain("`open_change`");
});
