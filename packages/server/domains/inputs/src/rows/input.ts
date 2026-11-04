import { row } from "@antumbra/platform-feature/row.ts";
import { SessionInput } from "@antumbra/platform-vocabulary/inputs.ts";
export const sessionInput = row("sessionInput", SessionInput.fields, { key: "id", scope: "sessionId" });
