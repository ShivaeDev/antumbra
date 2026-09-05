import { expect, it } from "@effect/vitest";
import { crewRest } from "#crew-rest.ts";
import { session, world } from "#test/piece-ladder-fixtures.ts";

const root = (agentId: string, id: string) => ({ ...session("idle"), agentId, id });

it("resting crew follows Agent order and ignores closed history", () => {
	const rows = world({
		agentStatus: new Map([
			["rested-b", "alive"],
			["busy", "alive"],
			["rested-a", "alive"],
			["retired", "retired"],
		]),
		sessions: [
			root("rested-a", "first"),
			{ ...root("busy", "working"), executionStatus: "active" },
			root("rested-b", "second"),
			{ ...root("rested-a", "history"), status: "closed", executionStatus: "active" },
			root("retired", "retired"),
		],
	});
	const reading = crewRest(rows, { attached: new Set(rows.sessions.map((row) => row.id)), delegating: new Set() });
	expect([...reading.resting]).toEqual([
		["rested-b", ["second"]],
		["rested-a", ["first"]],
	]);
	expect([...reading.retirable]).toEqual(["rested-b", "rested-a"]);
});

it("rootless, delegating and detached crew can retire without qualifying as rested", () => {
	const rows = world({
		agentStatus: new Map([
			["rootless", "alive"],
			["delegating", "alive"],
			["asleep", "alive"],
			["stranded", "alive"],
		]),
		sessions: [root("delegating", "delegating"), root("asleep", "asleep"), { ...root("stranded", "stranded"), executionStatus: "active" }],
	});
	const reading = crewRest(rows, { attached: new Set(["delegating"]), delegating: new Set(["delegating"]) });
	expect(reading.resting.size).toBe(0);
	expect([...reading.retirable]).toEqual(["rootless", "delegating", "asleep", "stranded"]);
});
