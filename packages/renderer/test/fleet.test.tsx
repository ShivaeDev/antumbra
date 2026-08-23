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
	canRetire: !canInterrupt,
	charter: "chart the reef",
	diag: { currentSessionId: "session-1", intents: [] },
	id: "agent-1",
	role: "navigator-of-the-northern-approach",
	sessions: [
		{
			addressable: [],
			backend: "scripted",
			canInterrupt,
			canSend: canInterrupt,
			canSleep: false,
			cwd: "/tmp/reef",
			diag: { current: true, execution, intents: [] },
			id: "session-1",
			presence: canInterrupt ? "working" : "asleep",
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

const recovering = {
	detail: null,
	id: "intent-1",
	kind: "agent/recover",
	state: "waiting",
};
const retiring = {
	detail: null,
	id: "intent-2",
	kind: "agent/retire",
	state: "queued",
};
const spawning = {
	detail: null,
	id: "intent-3",
	kind: "agent/spawn",
	state: "queued",
};

const draining: AgentSummary = {
	...navigator(false, "draining"),
	diag: { currentSessionId: null, intents: [retiring] },
	role: "navigator",
	sessions: [
		{
			addressable: [],
			backend: "scripted",
			canInterrupt: false,
			canSend: false,
			canSleep: false,
			cwd: "/tmp/reef",
			diag: { current: false, execution: "draining", intents: [recovering] },
			id: "session-1",
			presence: "asleep",
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

// why: retirement follows the published capability, never the stored status
// word beside it. An Agent mid-turn reads "alive" exactly as a resting one
// does, and ending it there would stop work nobody asked to stop.
it("offers retirement only when the public capability allows it", () => {
	const resting = render(fleetOf([navigator(false, "idle")]));
	expect(resting).toContain("Retire");
	const working = render(fleetOf([navigator(true, "active")]));
	expect(working).not.toContain("Retire");
	const gone = render(
		fleetOf([
			{ ...navigator(false, "idle"), canRetire: false, status: "retired" },
		]),
	);
	expect(gone).not.toContain("Retire");
});

const listening = (canSleep: boolean): AgentSummary => ({
	...navigator(false, "idle"),
	sessions: [
		{
			addressable: [],
			backend: "scripted",
			canInterrupt: false,
			canSend: true,
			canSleep,
			cwd: "/tmp/reef",
			diag: { current: true, execution: "idle", intents: [] },
			id: "session-1",
			presence: "idle",
			status: "open",
		},
	],
});

// why: rest is offered from the same published capability the act itself
// re-checks, so a tree with a child still speaking simply has no button —
// there is nothing the admiral could do about it, and a disabled control
// would be a question with no answer.
it("offers rest only when the public capability allows it", () => {
	expect(render(fleetOf([listening(true)]))).toContain("Sleep");
	expect(render(fleetOf([listening(false)]))).not.toContain("Sleep");
});
