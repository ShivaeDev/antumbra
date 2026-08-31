import { expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { fleet } from "#fixtures/fleet.ts";
import { crewedFleet } from "#fixtures/scripted-turns.ts";
import { Fleet } from "#fleet.ts";

const agentAround = (session: Record<string, unknown>) => ({
	agents: [
		{
			berths: [],
			canRetire: false,
			charter: "chart the reef",
			diag: { currentSessionId: "session-1", intents: [] },
			id: "agent-1",
			role: "navigator",
			sessions: [session],
			status: "alive",
			work: [],
		},
	],
	backends: ["scripted"],
	capacities: [],
	diag: { intents: [] },
	repos: [],
});

const idleSession = {
	addressable: [],
	backend: "scripted",
	canAttachImages: false,
	canInterrupt: false,
	canSend: false,
	canSleep: false,
	cwd: "/tmp/reef",
	diag: { current: true, execution: "idle", intents: [] },
	id: "session-1",
	presence: "idle",
	status: "open",
};

it("publishes backend capacity independently of Session execution", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)({
		...agentAround(idleSession),
		capacities: [
			{
				backend: "scripted",
				detail: "Hourly provider limit reached",
				reason: "rate-limit",
				resetsAt: 1_788_046_800_000,
				status: "blocked",
				utilization: 1,
			},
		],
	});
	expect(decoded.capacities).toEqual([expect.objectContaining({ backend: "scripted", status: "blocked" })]);
});

const siesta = {
	detail: null,
	id: "intent-1",
	kind: "session/siesta",
	state: "queued",
};

it("admits raw Session execution state only under diagnostics", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)(
		agentAround({
			...idleSession,
			diag: { current: true, execution: "draining", intents: [siesta] },
			executionStatus: "draining",
			posture: "draining",
			presence: "asleep",
		}),
	);
	const session = decoded.agents[0]?.sessions[0];
	expect(session?.diag).toEqual({
		current: true,
		execution: "draining",
		intents: [siesta],
	});
	expect(session).not.toHaveProperty("executionStatus");
	expect(session).not.toHaveProperty("posture");
});

it("refuses a Session that publishes no diagnostics at all", () => {
	const { diag: _, ...withoutDiagnostics } = idleSession;
	const decoded = Schema.decodeUnknownOption(Fleet)(agentAround(withoutDiagnostics));
	expect(decoded._tag).toBe("None");
});

it("carries an agent's piece and voyage", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)(crewedFleet);
	expect(decoded.agents[1]?.work).toEqual([
		{
			kind: "piece",
			pieceId: "piece-1",
			pieceTitle: "soundings",
			voyageId: "voyage-1",
			voyageName: "Chart the reef",
		},
	]);
});

it("names a captain by the voyage it commands", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)(fleet);
	expect(decoded.agents[0]?.work).toEqual([{ kind: "voyage", voyageId: "voyage-1", voyageName: "Chart the reef" }]);
});
