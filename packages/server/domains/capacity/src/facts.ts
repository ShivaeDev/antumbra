import { fact } from "@antumbra/platform-feature/fact.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";
import { capacity } from "#rows/capacity.ts";

export const capacityObserved = fact("CapacityObserved", { ...capacity.fields, observedAt: Schema.Number });
export const capacityReleased = fact("CapacityReleased", { backend: AgentBackendTagSchema });
