import { fact } from "@antumbra/platform-feature/fact.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { capacity } from "#rows/capacity.ts";

export const capacityObserved = fact("CapacityObserved", capacity.fields);
export const capacityReleased = fact("CapacityReleased", { backend: AgentBackendTagSchema });
