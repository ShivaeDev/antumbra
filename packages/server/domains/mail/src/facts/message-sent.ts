import { fact } from "@antumbra/platform-feature/fact.ts";
import { MessageSent } from "@antumbra/platform-vocabulary/mail.ts";

export const messageSent = fact("MessageSent", MessageSent.fields);
