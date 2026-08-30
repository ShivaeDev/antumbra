import { expect, it } from "@effect/vitest";
import { pieceOutcomeTally } from "#outcome-status.ts";
import { change, crewing, finished, piece, stateOf, withChanges, world } from "#test/piece-ladder-fixtures.ts";

it("a piece someone is working reads active whatever it is waiting on", () => {
	const worked = withChanges(["open"], {
		agentStatus: new Map([["agent-1", "alive"]]),
		assignments: [{ agentId: "agent-1", pieceId: "alpha" }],
	});
	expect(stateOf(worked)).toBe("active");
});

it("a piece is shipped only when all of its work is done", () => {
	const idle = crewing("alpha", "idle");
	const busy = crewing("alpha", "active");
	expect(stateOf(withChanges(["landed"], idle))).toBe("done");
	expect(stateOf(withChanges(["landed", "open"], idle))).toBe("landing");
	expect(stateOf(withChanges(["landed"], busy))).toBe("active");
	expect(stateOf(withChanges(["landed", "open"], busy))).toBe("active");
});

it("a landed piece reads done while no crew is working it", () => {
	const shipped = withChanges(["landed", "landed"], crewing("alpha", "idle"));
	expect(pieceOutcomeTally(shipped, "alpha")).toEqual({
		landed: 2,
		pending: 0,
	});
	expect(stateOf(shipped)).toBe("done");
});

it("work asked for again on a landed piece puts it back in progress", () => {
	const redone = withChanges(["landed"], crewing("alpha", "active"));
	expect(pieceOutcomeTally(redone, "alpha")).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(redone)).toBe("active");
});

it("a piece worked again reads done once that crew is finished", () => {
	const redone = withChanges(["landed"], crewing("alpha", "active"));
	expect(stateOf(redone)).toBe("active");
	expect(stateOf(finished(redone))).toBe("done");
});

it("a crew still draining holds a landed piece short of done", () => {
	const draining = crewing("alpha", "draining");
	expect(stateOf(withChanges(["landed"], draining))).toBe("active");
});

it("an abandoned piece stays abandoned while its crew is still working", () => {
	const writtenOff = withChanges(["landed"], {
		...crewing("alpha", "active"),
		pieceVerdicts: new Map([["alpha", "abandoned"]]),
	});
	expect(stateOf(writtenOff)).toBe("abandoned");
	expect(stateOf(finished(writtenOff))).toBe("abandoned");
});

// why: the crew is asked about to decide what a piece reads as, never what may
// sail behind it. Work that landed releases what waited on it whether or not
// the crew that landed it has finished saying so, which is what keeps a chain
// sailing as outcomes land rather than as crews say their goodbyes.
it("a piece worked again still releases what depended on it", () => {
	const built = world({
		...crewing("bravo", "active"),
		changes: [change("change-0", "landed")],
		edges: [{ fromPieceId: "bravo", toPieceId: "alpha" }],
		pieceChanges: [{ changeId: "change-0", pieceId: "bravo", purpose: "produces" }],
		pieces: [piece("alpha"), piece("bravo")],
	});
	expect(stateOf(built, "bravo")).toBe("active");
	expect(stateOf(built)).toBe("ready");
	expect(stateOf(finished(built), "bravo")).toBe("done");
});
