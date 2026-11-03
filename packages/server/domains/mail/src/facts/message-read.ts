import { fact } from "@antumbra/platform-feature/fact.ts";
import { MessageRead } from "@antumbra/platform-vocabulary/mail.ts";

export const messageRead = fact("MessageRead", MessageRead.fields);
