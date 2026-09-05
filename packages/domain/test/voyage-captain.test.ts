import type { AgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { expect, it } from "@effect/vitest";
import { Option } from "effect";
import { captainOf } from "#voyage-captain.ts";
import type { AgentSessionRow } from "#voyage-rows.ts";

type CaptainRows = Parameters<typeof captainOf>[0];

const session = (agentId: string, executionStatus: AgentSessionRow["executionStatus"]): AgentSessionRow => ({
	agentId,
	backend: "scripted",
	createdAt: new Date(1),
	executionStatus,
	id: `session-${agentId}`,
	status: "open",
});

const world = (over: Partial<CaptainRows>): CaptainRows => ({
	agentStatus: new Map(),
	assignments: [],
	crews: [],
	currentSessionByAgent: new Map(),
	sessions: [],
	...over,
});

const captained = (agentId: string, status: AgentStatus, sessions: ReadonlyArray<AgentSessionRow> = []): CaptainRows =>
	world({
		agentStatus: new Map([[agentId, status]]),
		crews: [{ agentId, role: "captain", voyageId: "voyage-1" }],
		currentSessionByAgent: new Map([[agentId, sessions[0]?.id ?? null] as const]),
		sessions,
	});

const captain = (rows: CaptainRows) => Option.getOrThrow(captainOf(rows, "voyage-1"));

it("a captain that stood down is the voyage's address and not at work", () => {
	const stoodDown = captained("agent-1", "alive", [session("agent-1", "idle")]);
	expect(captain(stoodDown)).toEqual({
		agentId: "agent-1",
		atWork: false,
		sessionId: "session-agent-1",
		status: "alive",
	});
});

it("a captain executing, draining or still being born is at work", () => {
	for (const executionStatus of ["active", "draining"] as const) {
		expect(captain(captained("agent-1", "alive", [session("agent-1", executionStatus)])).atWork).toBe(true);
	}
	expect(captain(captained("agent-1", "spawning")).atWork).toBe(true);
});

it("a retired or dormant captain of record stays history, never at work", () => {
	for (const status of ["dormant", "retired"] as const) {
		const past = captained("agent-1", status, [session("agent-1", "idle")]);
		expect(captain(past)).toEqual({
			agentId: "agent-1",
			atWork: false,
			sessionId: null,
			status,
		});
	}
});

it("a voyage nobody has captained has no captain to read at all", () => {
	expect(Option.isNone(captainOf(world({}), "voyage-1"))).toBe(true);
});
