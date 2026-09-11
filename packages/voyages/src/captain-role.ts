import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";

export const captainRoleOf = (kind: string): AgentRole => (kind === "flagship" ? "flagship" : "captain");
