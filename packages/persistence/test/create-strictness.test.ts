import { describe, expect, it } from "vitest";
import type { NewAgentSession } from "#writes.ts";

const whole: NewAgentSession = {
	agentId: "agent-strictness",
	cwd: "/tmp/agent-strictness",
	id: "session-strictness",
	rootSessionId: "session-strictness",
	status: "open",
};

// @ts-expect-error rootSessionId is NOT NULL and carries no default: leaving it out must not compile.
const truncated: NewAgentSession = {
	agentId: "agent-strictness",
	cwd: "/tmp/agent-strictness",
	id: "session-strictness",
	status: "open",
};

describe("agent session create input", () => {
	it("demands every column the database cannot fill on its own", () => {
		expect(whole.rootSessionId).toBe("session-strictness");
		expect(truncated).not.toHaveProperty("rootSessionId");
	});
});
