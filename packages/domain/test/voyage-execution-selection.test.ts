import { expect, it } from "@effect/vitest";
import { atWork } from "#agent-at-work.ts";
import {
	assignedExecution,
	executionSessionOfAgent,
} from "#voyage-execution-selection.ts";
import type { AgentSessionRow, VoyageWorld } from "#voyage-rows.ts";

const session = (
	agentId: string,
	id: string,
	executionStatus: AgentSessionRow["executionStatus"] = "idle",
	createdAt = new Date(1),
): AgentSessionRow => ({
	agentId,
	createdAt,
	executionStatus,
	id,
	status: "open",
});

const world = (over: Partial<VoyageWorld>): VoyageWorld => ({
	agentStatus: new Map(),
	artifacts: new Map(),
	assignments: [],
	changes: [],
	crews: [],
	currentSessionByAgent: new Map(),
	dismissedChangeIds: new Set(),
	edges: [],
	memberships: [],
	pieceChanges: [],
	pieceReports: [],
	pieceVerdicts: new Map(),
	rulingGates: [],
	pieces: [],
	reports: new Map(),
	repos: new Map(),
	sessions: [],
	voyages: [],
	...over,
});

it("chooses the lexical alive assignee independent of row order", () => {
	const view = world({
		agentStatus: new Map([
			["agent-z", "alive"],
			["agent-a", "alive"],
		]),
		assignments: [
			{ agentId: "agent-z", pieceId: "piece-one" },
			{ agentId: "agent-a", pieceId: "piece-one" },
		],
		currentSessionByAgent: new Map([
			["agent-z", "session-z"],
			["agent-a", "session-a"],
		]),
		sessions: [
			session("agent-z", "session-z"),
			session("agent-a", "session-a"),
		],
	});
	expect(assignedExecution(view, "piece-one")).toEqual({
		_tag: "resume",
		agentId: "agent-a",
		sessionId: "session-a",
	});
});

it("holds on the lexical Agent instead of trying another or spawning", () => {
	const view = world({
		agentStatus: new Map([
			["agent-a", "alive"],
			["agent-b", "alive"],
		]),
		assignments: [
			{ agentId: "agent-b", pieceId: "piece-one" },
			{ agentId: "agent-a", pieceId: "piece-one" },
		],
		currentSessionByAgent: new Map([
			["agent-a", "session-a"],
			["agent-b", "session-b"],
		]),
		sessions: [
			session("agent-a", "session-a", "active"),
			session("agent-b", "session-b"),
		],
	});
	expect(assignedExecution(view, "piece-one")).toEqual({
		_tag: "unavailable",
		agentId: "agent-a",
	});
});

it("uses explicit current truth and otherwise newest open history", () => {
	const sessions = [
		session("agent-a", "session-a"),
		session("agent-a", "session-b"),
	];
	expect(
		executionSessionOfAgent(
			world({
				currentSessionByAgent: new Map([["agent-a", "session-a"]]),
				sessions,
			}),
			"agent-a",
		)?.id,
	).toBe("session-a");
	expect(
		executionSessionOfAgent(
			world({
				currentSessionByAgent: new Map([["agent-a", null]]),
				sessions,
			}),
			"agent-a",
		)?.id,
	).toBe("session-b");
});

it("ignores retired identity and stale execution for dispatch state", () => {
	const stale = session("agent-a", "session-b", "active");
	const view = world({
		agentStatus: new Map([
			["agent-a", "alive"],
			["agent-retired", "retired"],
		]),
		assignments: [{ agentId: "agent-retired", pieceId: "piece-retired" }],
		currentSessionByAgent: new Map([
			["agent-a", "session-a"],
			["agent-retired", null],
		]),
		sessions: [session("agent-a", "session-a"), stale],
	});
	expect(assignedExecution(view, "piece-retired")).toEqual({
		_tag: "unassigned",
	});
	expect(atWork(view, "agent-a")).toBe(false);
});
