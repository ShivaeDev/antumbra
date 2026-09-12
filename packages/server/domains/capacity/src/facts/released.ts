import { fact } from "@antumbra/platform-feature/fact.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";

export const capacityReleased = fact("CapacityReleased", { backend: AgentBackendTagSchema });
