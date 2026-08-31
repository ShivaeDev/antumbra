import type { NewAgentSession } from "#writes.ts";

const acceptsAgentSession = (_input: NewAgentSession): void => {};

acceptsAgentSession({
	agentId: "agent-strictness",
	cwd: "/tmp/agent-strictness",
	id: "session-strictness",
	rootSessionId: "session-strictness",
	status: "open",
});

// @ts-expect-error rootSessionId is NOT NULL and carries no default: leaving it out must not compile.
acceptsAgentSession({
	agentId: "agent-strictness",
	cwd: "/tmp/agent-strictness",
	id: "session-strictness",
	status: "open",
});
