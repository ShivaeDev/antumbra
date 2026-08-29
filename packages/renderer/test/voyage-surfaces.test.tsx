import type { VoyageSummary } from "@antumbra/contract";
import { reefSummary, reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PiecesPanel } from "#views/pieces.tsx";
import { VoyagesPanel } from "#views/voyages.tsx";
import { VoyagesAside } from "#views/voyages-aside.tsx";

const list = () =>
	renderToStaticMarkup(
		<VoyagesPanel
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
			voyages={[reefSummary]}
		/>,
	);

const aside = () =>
	renderToStaticMarkup(
		<VoyagesAside
			backends={["claude"]}
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
			voyages={[reefSummary]}
		/>,
	);

const flagshipSummary: VoyageSummary = {
	...reefSummary,
	id: "voyage-flagship",
	kind: "flagship",
	name: "Flagship",
	northStar: "The fleet sails well.",
};

const fleet = () =>
	renderToStaticMarkup(
		<VoyagesPanel
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
			voyages={[reefSummary, flagshipSummary]}
		/>,
	);

const pieces = () =>
	renderToStaticMarkup(
		<PiecesPanel
			onError={() => undefined}
			pieces={reefView.pieces}
			voyageId={reefView.id}
		/>,
	);

it("a voyage's standing is a bar the eye reads, not a run of arithmetic", () => {
	const html = list();

	expect(html).toContain('role="img"');
	expect(html).toContain('aria-label="0 of 2 landed, 1 active"');
	expect(html).toContain("0 of 2 landed");
	expect(html).not.toContain("0/2");
	expect(html).not.toContain("0 ready");
});

it("the list leads with the voyage, its state and its north star", () => {
	const html = list();

	expect(html).toContain("Chart the reef");
	expect(html).toContain("Under way");
	expect(html).toContain("every shoal is known");
});

it("opening a voyage asks for the sidebar only once it is pressed", () => {
	const html = aside();

	expect(html).toContain("Open voyage");
	expect(html).not.toContain("North star");
	expect(html).not.toContain("no backend registered");
});

it("chartering a piece is offered from the heading, not spread under it", () => {
	const html = pieces();

	expect(html).toContain("Charter piece");
	expect(html).not.toContain("Expected outcome");
});

it("every piece wears the state the domain derived for it", () => {
	const html = pieces();

	expect(html).toContain("soundings");
	expect(html).toContain("Active");
	expect(html).toContain("the chart");
	expect(html).toContain("Held");
	expect(html).toContain("sound the northern shoals");
});

it("the fleet's own voyage leads the list wearing its mark", () => {
	const html = fleet();

	expect(html).toContain("Flagship");
	expect(html.indexOf("Flagship")).toBeLessThan(html.indexOf("Chart the reef"));
});

it("an ordinary voyage wears no mark of its own", () => {
	expect(list()).not.toContain("Flagship");
});
