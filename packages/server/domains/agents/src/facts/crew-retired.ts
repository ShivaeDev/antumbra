import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { AgentId } from "#ids.ts";
export const crewRetired = fact("CrewRetired", { agentIds: Schema.Array(AgentId) });
