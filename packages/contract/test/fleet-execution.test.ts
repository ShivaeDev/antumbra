import { expect, it } from "@effect/vitest";
import { Schema } from "effect";
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
		},
	],
	backends: ["scripted"],
	diag: { intents: [] },
	repos: [],
});

const siesta = { id: "intent-1", kind: "session/siesta", state: "queued" };

// why: the discipline this test has always guarded is that raw Session
// execution state is never an ordinary Session field the view can mistake for
// a capability. Diagnostics are the one sanctioned door: the raw words reach
// the view under `diag` and nowhere else on the Session.
it("admits raw Session execution state only under diagnostics", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)(
		agentAround({
			backend: "scripted",
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
		backend: "scripted",
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
