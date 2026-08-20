import type { AgentSummary, Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FleetPanel } from "#views/fleet.tsx";

const render = (fleet: Fleet): string =>
	renderToStaticMarkup(
		<FleetPanel
			fleet={fleet}
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
		/>,
	);

const fleetOf = (agents: ReadonlyArray<AgentSummary>): Fleet => ({
	agents,
	backends: ["scripted"],
	diag: { intents: [] },
	repos: [],
});

const navigator = (canInterrupt: boolean, execution: string): AgentSummary => ({
	berths: [],
	charter: "chart the reef",
	diag: { currentSessionId: "session-1", intents: [] },
	id: "agent-1",
	role: "navigator-of-the-northern-approach",
	sessions: [
		{
			backend: "scripted",
			canInterrupt,
			canSend: canInterrupt,
			cwd: "/tmp/reef",
			diag: { current: true, execution, intents: [] },
			id: "session-1",
			status: "open",
		},
	],
	status: "alive",
});

const renderFleet = (canInterrupt: boolean, execution: string): string =>
	render(fleetOf([navigator(canInterrupt, execution)]));

// why: the discipline this test has always guarded is that the interrupt
// affordance follows the published capability and nothing else. It still
// does — the raw execution word is now visible beside it as a diagnostic
// chip, and the executing-but-refused case is what proves the affordance
// never reads that word.
it("offers interrupt only when the public capability allows it", () => {
	expect(renderFleet(true, "active")).toContain("Interrupt");
	expect(renderFleet(false, "idle")).not.toContain("Interrupt");
	const stranded = renderFleet(false, "active");
	expect(stranded).not.toContain("Interrupt");
	expect(stranded).toContain("active");
});

const recovering = { id: "intent-1", kind: "agent/recover", state: "waiting" };
const retiring = { id: "intent-2", kind: "agent/retire", state: "queued" };
const spawning = { id: "intent-3", kind: "agent/spawn", state: "queued" };

const draining: AgentSummary = {
	...navigator(false, "draining"),
	diag: { currentSessionId: null, intents: [retiring] },
	role: "navigator",
	sessions: [
		{
			backend: "scripted",
			canInterrupt: false,
			canSend: false,
			cwd: "/tmp/reef",
			diag: { current: false, execution: "draining", intents: [recovering] },
			id: "session-1",
			status: "open",
		},
	],
};

it("renders the raw execution and intent words as chips", () => {
	const markup = render({
		...fleetOf([draining]),
		diag: { intents: [spawning] },
	});
	expect(markup).toContain("draining");
	expect(markup).toContain("intent: agent/recover waiting");
	expect(markup).toContain("intent: agent/retire queued");
	expect(markup).toContain("intent: agent/spawn queued");
	expect(markup).toContain("current none");
});

// why: the name the admiral gave an agent is the one thing on the card that
// must never be abbreviated, and it used to be the first thing to go.
it("writes an agent's role out in full", () => {
	expect(renderFleet(true, "active")).toContain(
		"navigator-of-the-northern-approach",
	);
});

it("groups the roster by standing, working first", () => {
	const markup = render(
		fleetOf([
			{ ...navigator(false, "idle"), id: "agent-quiet", role: "quiet-one" },
			{ ...navigator(true, "active"), id: "agent-busy", role: "busy-one" },
		]),
	);
	expect(markup.indexOf("busy-one")).toBeLessThan(markup.indexOf("quiet-one"));
	expect(markup).toContain("working");
});

// why: spawning and mooring are occasional acts. They keep their buttons on
// the page and their fields behind a dialog, so the roster is what the page
// shows when nothing has been asked for.
it("keeps the spawn fields behind their dialog", () => {
	const markup = renderFleet(false, "idle");
	expect(markup).toContain("Spawn agent");
	expect(markup).toContain("Repositories");
	expect(markup).not.toContain("what this agent is for");
});

it("offers no retirement for an agent that is already retired", () => {
	const alive = render(fleetOf([navigator(false, "idle")]));
	expect(alive).toContain("Retire");
	const gone = render(
		fleetOf([{ ...navigator(false, "idle"), status: "retired" }]),
	);
	expect(gone).not.toContain("Retire");
});
