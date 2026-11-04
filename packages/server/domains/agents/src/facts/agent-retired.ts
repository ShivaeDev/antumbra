import { fact } from "@antumbra/platform-feature/fact.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
export const agentRetired = fact("AgentRetired", { id: AgentId });
