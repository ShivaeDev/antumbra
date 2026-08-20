import type { AgentSummary, SessionSummary } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { rosterGroups, standingOf } from "#fleet/roster.ts";

const session = (
	id: string,
	canInterrupt: boolean,
	status: string,
): SessionSummary => ({
	backend: "scripted",
	canInterrupt,
	canSend: canInterrupt,
	cwd: "/tmp/reef",
	diag: { current: true, execution: "idle", intents: [] },
	id,
	status,
});

const agent = (
	id: string,
	status: string,
	sessions: ReadonlyArray<SessionSummary>,
): AgentSummary => ({
	berths: [],
	charter: "chart the reef",
	diag: { currentSessionId: null, intents: [] },
	id,
	role: `role-${id}`,
	sessions,
	status,
});

const working = agent("working", "alive", [session("s1", true, "open")]);
const waiting = agent("waiting", "alive", [session("s2", false, "open")]);
const quiet = agent("quiet", "alive", [session("s3", false, "closed")]);
const retired = agent("retired", "retired", [session("s4", true, "open")]);

it("reads an agent's standing from what the fleet publishes", () => {
	expect(standingOf(working)).toBe("working");
	expect(standingOf(waiting)).toBe("waiting");
	expect(standingOf(quiet)).toBe("quiet");
	expect(standingOf(agent("none", "alive", []))).toBe("quiet");
});

// why: an agent the admiral has finished with keeps no claim on attention,
// whatever its last session was still able to do.
it("counts a retired agent as retired however its sessions read", () => {
	expect(standingOf(retired)).toBe("retired");
});

it("puts the agents taking a turn first and the retired ones last", () => {
	const groups = rosterGroups([retired, quiet, waiting, working]);
	expect(groups.map((group) => group.standing)).toEqual([
		"working",
		"waiting",
		"quiet",
		"retired",
	]);
	expect(groups[0]?.agents).toEqual([working]);
});

it("leaves out a standing no agent holds", () => {
	expect(rosterGroups([working]).map((group) => group.standing)).toEqual([
		"working",
	]);
	expect(rosterGroups([])).toEqual([]);
});
