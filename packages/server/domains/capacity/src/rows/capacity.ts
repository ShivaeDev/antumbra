import { row } from "@antumbra/platform-feature/row.ts";
import { CapacityObservationFields } from "@antumbra/platform-runner/log.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";

export const capacity = row("capacity", { ...CapacityObservationFields, backend: AgentBackendTagSchema }, { key: "backend" });
