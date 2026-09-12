import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { agent } from "#rows/agent.ts";
export const atWork = (held: typeof agent.Row.Type, sessions: ReadonlyArray<typeof session.Row.Type>): boolean => {
	if (held.status === "spawning") return true;
	if (held.status !== "alive") return false;
	const current = sessions.find((value) => value.id === held.currentSessionId);
	return current === undefined || current.executionStatus !== "idle";
};
