import type { AgentSummary, SessionSummary } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { rosterGroups, standingOf } from "#fleet/roster.ts";

const session = (id: string, presence: SessionSummary["presence"]): SessionSummary => ({
	addressable: [],
	backend: "scripted",
	canAttachImages: false,
	canInterrupt: presence === "working",
	canSend: presence !== "ended",
	canSleep: presence === "idle",
	cwd: "/tmp/reef",
	diag: { current: true, execution: "idle", intents: [] },
	id,
	presence,
	status: presence === "ended" ? "closed" : "open",
});

const agent = (id: string, status: string, sessions: ReadonlyArray<SessionSummary>): AgentSummary => ({
	berths: [],
	canRetire: status === "alive",
	charter: "chart the reef",
	diag: { currentSessionId: null, intents: [] },
	id,
	role: `role-${id}`,
	sessions,
	status,
});

const working = agent("working", "alive", [session("s1", "working")]);
const listening = agent("listening", "alive", [session("s2", "idle")]);
const asleep = agent("asleep", "alive", [session("s3", "asleep")]);
const stranded = agent("stranded", "alive", [session("s10", "stranded")]);
const quiet = agent("quiet", "alive", [session("s4", "ended")]);
const retired = agent("retired", "retired", [session("s5", "working")]);

// why: listening, asleep and stranded used to read alike, and the differences
// are the ones the admiral acts on — one answers at once, one has to be woken,
// and one lost its process with work still unfinished.
it("reads an agent's standing from what the fleet publishes", () => {
	expect(standingOf(working)).toBe("working");
	expect(standingOf(listening)).toBe("listening");
	expect(standingOf(asleep)).toBe("asleep");
	expect(standingOf(stranded)).toBe("stranded");
	expect(standingOf(quiet)).toBe("quiet");
	expect(standingOf(agent("none", "alive", []))).toBe("quiet");
});

// why: an agent stands at the liveliest of its sessions, because that is the
// one a reader looking for it would find it in.
it("stands an agent at its liveliest session", () => {
	expect(standingOf(agent("mixed", "alive", [session("s6", "asleep"), session("s7", "idle")]))).toBe("listening");
	expect(standingOf(agent("busy", "alive", [session("s8", "asleep"), session("s9", "working")]))).toBe("working");
	// why: stranded outranks the quiet standings, because it is the one nothing
	// but the admiral will change.
	expect(standingOf(agent("lost", "alive", [session("s11", "idle"), session("s12", "stranded")]))).toBe("stranded");
});

// why: an agent the admiral has finished with keeps no claim on attention,
// whatever its last session was still able to do.
it("counts a retired agent as retired however its sessions read", () => {
	expect(standingOf(retired)).toBe("retired");
});

it("puts the agents taking a turn first and the retired ones last", () => {
	const groups = rosterGroups([retired, quiet, asleep, listening, stranded, working]);
	expect(groups.map((group) => group.standing)).toEqual(["working", "stranded", "listening", "asleep", "quiet", "retired"]);
	expect(groups[0]?.agents).toEqual([working]);
});

it("leaves out a standing no agent holds", () => {
	expect(rosterGroups([working]).map((group) => group.standing)).toEqual(["working"]);
	expect(rosterGroups([])).toEqual([]);
});
