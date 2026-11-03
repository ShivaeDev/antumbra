import { row } from "@antumbra/platform-feature/row.ts";
import { Message } from "@antumbra/platform-vocabulary/mail.ts";

export const message = row("message", Message.fields, { key: "id", scope: "toAgentId" });
