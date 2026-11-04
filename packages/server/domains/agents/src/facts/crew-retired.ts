import { fact } from "@antumbra/platform-feature/fact.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
export const crewRetired = fact("CrewRetired", { agentIds: Schema.Array(AgentId) });
