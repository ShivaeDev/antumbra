import type { VoyageSummary } from "@antumbra/contract";
import {
	flagshipSummary,
	fleet,
	reefSummary,
} from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FlagshipPanel } from "#views/flagship.tsx";
import { ModeNav } from "#views/mode-nav.tsx";

const render = (voyages: ReadonlyArray<VoyageSummary>): string =>
	renderToStaticMarkup(
		<FlagshipPanel fleet={fleet} onError={() => undefined} voyages={voyages} />,
	);

const captained: VoyageSummary = {
	...flagshipSummary,
	captain: {
		agentId: "agent-1",
		atWork: true,
		sessionId: "session-1",
		status: "alive",
	},
};

it("offers the flagship first, because it is where the admiral speaks", () => {
	const html = renderToStaticMarkup(
		<ModeNav mode="flagship" onMode={() => undefined} />,
	);

	expect(html).toContain("Flagship");
	expect(html.indexOf("Flagship")).toBeLessThan(html.indexOf("Fleet"));
});

it("a flagship with no captain says so and offers the hail", () => {
	const html = render([flagshipSummary, reefSummary]);

	expect(html).toContain("the flagship captain has no conversation open yet");
	expect(html).toContain("Hail a captain");
	expect(html).not.toContain("Message this session");
});

it("the captain of another voyage is not the one the tab opens on", () => {
	expect(render([flagshipSummary, reefSummary])).not.toContain("session-1");
});

it("a flagship captain aboard is opened on, conversation and all", () => {
	const html = render([captained, reefSummary]);

	expect(html).toContain("session-1");
	expect(html).toContain("Message this session");
	expect(html).toContain("no events yet");
	expect(html).not.toContain("Hail a captain");
});

it("the tab is the whole surface, so nothing offers to close it", () => {
	expect(render([captained])).not.toContain("Close transcript");
});
