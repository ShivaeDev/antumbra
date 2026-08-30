import type { VoyageCaptainView, VoyageSummary, VoyageView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VoyageHeader } from "#views/voyage-header.tsx";
import { VoyagesPanel } from "#views/voyages.tsx";

const summary = (captain: VoyageCaptainView | null): VoyageSummary => ({
	captain,
	captainBackend: "scripted",
	counts: { active: 0, done: 0, pieces: 0, ready: 0 },
	crewBackend: "scripted",
	focusedAt: null,
	id: "voyage-1",
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
	state: "quiet",
});

const view = (captain: VoyageCaptainView | null): VoyageView => ({
	...summary(captain),
	board: [],
	context: "",
	crew: [],
	pieces: [],
});

const stoodDown: VoyageCaptainView = {
	agentId: "agent-1",
	atWork: false,
	sessionId: "session-1",
	status: "alive",
};

const renderPanel = (captain: VoyageCaptainView | null) =>
	renderToStaticMarkup(<VoyagesPanel onError={() => undefined} onSelect={() => undefined} selected={undefined} voyages={[summary(captain)]} />);

const renderHeader = (captain: VoyageCaptainView | null) => renderToStaticMarkup(<VoyageHeader onError={() => undefined} voyage={view(captain)} />);

it("a captain at work is the address, so nothing offers to call another", () => {
	const working = { ...stoodDown, atWork: true };
	for (const rendered of [renderPanel(working), renderHeader(working)]) {
		expect(rendered).not.toContain("Hail");
		expect(rendered).not.toContain("Wake");
	}
});

it("a captain that stood down is offered the wake, wherever it is shown", () => {
	for (const rendered of [renderPanel(stoodDown), renderHeader(stoodDown)]) {
		expect(rendered).toContain("Wake the captain");
	}
});

it("a voyage with no captain is offered the hail, wherever it is shown", () => {
	for (const rendered of [renderPanel(null), renderHeader(null)]) {
		expect(rendered).toContain("Hail a captain");
	}
});
