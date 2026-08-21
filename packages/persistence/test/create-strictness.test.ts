import { describe, expect, it } from "vitest";
import type { NewAgentSession } from "#writes.ts";

const whole: NewAgentSession = {
	agentId: "agent-strictness",
	cwd: "/tmp/agent-strictness",
	id: "session-strictness",
	rootSessionId: "session-strictness",
	status: "open",
};

// why: this declaration is the regression proof. The generated create input
// carries a second overload for nested writes in which a foreign-key column may
// be omitted, and a top-level create fell through to it — so a NOT NULL column
// without a default could go missing with nothing to say so. If omitting one
// ever typechecks again, the pragma below becomes unused and the build fails.
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

	it("leaves defaulted and nullable columns to the caller's discretion", () => {
		expect(whole).not.toHaveProperty("backend");
		expect(whole).not.toHaveProperty("createdAt");
		expect(whole).not.toHaveProperty("parentSessionId");
	});
});
