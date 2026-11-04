import { row } from "@antumbra/platform-feature/row.ts";
import { Berth } from "@antumbra/platform-vocabulary/change-evidence.ts";

export const berth = row("berth", Berth.fields, { key: "id", scope: "agentId" });
