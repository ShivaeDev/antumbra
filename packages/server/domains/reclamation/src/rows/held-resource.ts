import { row } from "@antumbra/platform-feature/row.ts";
import { HeldResource } from "@antumbra/platform-vocabulary/change-evidence.ts";

export const heldResource = row("heldResource", HeldResource.fields, { key: "id", scope: "berthId" });
