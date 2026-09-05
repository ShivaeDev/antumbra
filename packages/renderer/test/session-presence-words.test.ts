import type { Fleet, SessionSummary } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { sessionMessageState } from "#views/session-message-state.ts";
import { presenceNote, presenceWords } from "#views/session-presence-words.ts";

const session = (presence: SessionSummary["presence"]): SessionSummary => ({
	addressable: [],
	backend: "scripted",
	canAttachImages: false,
	canInterrupt: false,
	canSend: presence !== "ended",
	canSleep: false,
	cwd: "/tmp/reef",
	diag: { current: true, execution: "active", intents: [] },
	id: "session-1",
	presence,
	status: presence === "ended" ? "closed" : "open",
});

const fleetOf = (presence: SessionSummary["presence"]): Fleet => ({
	agents: [
		{
			berths: [],
			canRetire: true,
			charter: "chart the reef",
			diag: { currentSessionId: "session-1", intents: [] },
			id: "agent-1",
			role: "hand",
			sessions: [session(presence)],
			status: "alive",
			work: [],
		},
	],
	backends: ["scripted"],
	capacities: [],
	diag: { intents: [] },
	repos: [],
	roleSettings: [],
});

it("says stranded in its own words, not asleep's", () => {
	expect(presenceWords.stranded).toBe("stranded");
	expect(presenceNote.stranded).toContain("its process is gone");
	expect(presenceNote.stranded).toContain("never finished");
	expect(presenceNote.stranded).not.toBe(presenceNote.asleep);
});

it("offers the send box on a stranded session and says why it is quiet", () => {
	const state = sessionMessageState(fleetOf("stranded"), "session-1");
	expect(state.blocked).toBeUndefined();
	expect(state.standing).toBe(presenceNote.stranded);
});

it("says nothing under the box while a session is working", () => {
	expect(sessionMessageState(fleetOf("working"), "session-1").standing).toBe(undefined);
});
