import { expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { fleet } from "#fixtures/fleet.ts";
import { crewedFleet } from "#fixtures/scripted-turns.ts";
import { shoalWarning } from "#fixtures/voyage.ts";
import { type AgentWork, Fleet } from "#fleet.ts";

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
	diag: { intents: [] },
	repos: [],
});

const siesta = {
	detail: null,
	id: "intent-1",
	kind: "session/siesta",
	state: "queued",
};

// why: the discipline this test has always guarded is that raw Session
// execution state is never an ordinary Session field the view can mistake for
// a capability. Diagnostics are the one sanctioned door: the raw words reach
// the view under `diag` and nowhere else on the Session.
it("admits raw Session execution state only under diagnostics", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)(
		agentAround({
			addressable: [],
			backend: "scripted",
			canAttachImages: false,
			canInterrupt: false,
			canSend: false,
			canSleep: false,
			cwd: "/tmp/reef",
			diag: { current: true, execution: "draining", intents: [siesta] },
			executionStatus: "draining",
			id: "session-1",
			posture: "draining",
			presence: "asleep",
			status: "open",
		}),
	);
	expect(decoded.agents[0]?.sessions[0]).toEqual({
		addressable: [],
		backend: "scripted",
		canAttachImages: false,
		canInterrupt: false,
		canSend: false,
		canSleep: false,
		cwd: "/tmp/reef",
		diag: { current: true, execution: "draining", intents: [siesta] },
		id: "session-1",
		presence: "asleep",
		status: "open",
	});
});

it("refuses a Session that publishes no diagnostics at all", () => {
	const decoded = Schema.decodeUnknownOption(Fleet)(
		agentAround({
			backend: "scripted",
			canInterrupt: false,
			canSend: false,
			cwd: "/tmp/reef",
			id: "session-1",
			status: "open",
		}),
	);
	expect(decoded._tag).toBe("None");
});

// why: what an agent is doing crosses the bridge as the piece and the voyage a
// card links to, with the change it produced standing where the quay would
// put it — decoded as such, so a card never rebuilds the reading from ids.
it("carries an agent's work and where its change stands", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)(crewedFleet);
	expect(decoded.agents[1]?.work).toEqual([
		{
			changes: [{ change: shoalWarning, standing: "alongside" }],
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
	expect(decoded.agents[0]?.work).toEqual([
		{ kind: "voyage", voyageId: "voyage-1", voyageName: "Chart the reef" },
	]);
});

// why: the helper hands back a shape the contract must refuse, so it is typed
// as the untrusted value it is rather than as work.
const misstanding = (work: AgentWork): Record<string, unknown> =>
	work.kind === "piece"
		? {
				...work,
				changes: work.changes.map((held) => ({ ...held, standing: "merged" })),
			}
		: work;

it("refuses a standing the quay has no word for", () => {
	const decoded = Schema.decodeUnknownOption(Fleet)({
		...crewedFleet,
		agents: crewedFleet.agents.map((agent) => ({
			...agent,
			work: agent.work.map(misstanding),
		})),
	});
	expect(decoded._tag).toBe("None");
});
