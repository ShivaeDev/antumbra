import { row } from "@antumbra/platform-feature/row.ts";
import { Moorage } from "@antumbra/platform-vocabulary/change-evidence.ts";

export const moorage = row("moorage", Moorage.fields, { key: "agentId" });
