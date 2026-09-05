import type { AgentSummary, Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FleetPanel } from "#views/fleet.tsx";

const render = (fleet: Fleet): string =>
	renderToStaticMarkup(
		<FleetPanel
			fleet={fleet}
			onError={() => undefined}
			onPiece={() => undefined}
			onSelect={() => undefined}
			onVoyage={() => undefined}
			selected={undefined}
		/>,
	);

const fleetOf = (agents: ReadonlyArray<AgentSummary>): Fleet => ({
	agents,
	backends: ["scripted"],
	capacities: [],
	diag: { intents: [] },
	repos: [],
	roleSettings: [],
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
			canAttachImages: false,
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
	work: [],
});

const renderFleet = (canInterrupt: boolean, execution: string): string => render(fleetOf([navigator(canInterrupt, execution)]));

it("offers interrupt only when the public capability allows it", () => {
	expect(renderFleet(true, "active")).toContain("Interrupt");
	expect(renderFleet(false, "idle")).not.toContain("Interrupt");
	const stranded = renderFleet(false, "active");
	expect(stranded).not.toContain("Interrupt");
	expect(stranded).toContain("active");
});

const waking = {
	detail: null,
	id: "intent-1",
	kind: "agent/wake",
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
			canAttachImages: false,
			canInterrupt: false,
			canSend: false,
			canSleep: false,
			cwd: "/tmp/reef",
			diag: { current: false, execution: "draining", intents: [waking] },
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
	expect(markup).toContain("intent: agent/wake waiting");
	expect(markup).toContain("intent: agent/retire queued");
	expect(markup).toContain("intent: agent/spawn queued");
	expect(markup).toContain("current none");
});

it("writes an agent's role out in full", () => {
	expect(renderFleet(true, "active")).toContain("navigator-of-the-northern-approach");
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

it("keeps the spawn fields behind their dialog", () => {
	const markup = renderFleet(false, "idle");
	expect(markup).toContain("Spawn agent");
	expect(markup).toContain("Repositories");
	expect(markup).not.toContain("what this agent is for");
});

it("offers retirement only when the public capability allows it", () => {
	const resting = render(fleetOf([navigator(false, "idle")]));
	expect(resting).toContain("Retire");
	const working = render(fleetOf([navigator(true, "active")]));
	expect(working).not.toContain("Retire");
	const gone = render(fleetOf([{ ...navigator(false, "idle"), canRetire: false, status: "retired" }]));
	expect(gone).not.toContain("Retire");
});

const listening = (canSleep: boolean): AgentSummary => ({
	...navigator(false, "idle"),
	sessions: [
		{
			addressable: [],
			backend: "scripted",
			canAttachImages: false,
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

it("offers rest only when the public capability allows it", () => {
	expect(render(fleetOf([listening(true)]))).toContain("Sleep");
	expect(render(fleetOf([listening(false)]))).not.toContain("Sleep");
});
