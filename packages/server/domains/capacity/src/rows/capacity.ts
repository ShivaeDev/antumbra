import { row } from "@antumbra/platform-feature/row.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { CapacityObservationFields } from "@antumbra/platform-vocabulary/capacity.ts";

export const capacity = row("capacity", { ...CapacityObservationFields, backend: AgentBackendTagSchema }, { key: "backend" });
