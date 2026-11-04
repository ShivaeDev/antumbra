import { row } from "@antumbra/platform-feature/row.ts";
import { Agent } from "@antumbra/platform-vocabulary/change-evidence.ts";

export const agent = row("agent", Agent.fields, { key: "id" });
