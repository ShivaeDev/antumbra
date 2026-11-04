import { row } from "@antumbra/platform-feature/row.ts";
import { ResourceOwner } from "@antumbra/platform-vocabulary/change-evidence.ts";
export const resourceOwner = row("resourceOwner", ResourceOwner.fields, { key: "agentId" });
