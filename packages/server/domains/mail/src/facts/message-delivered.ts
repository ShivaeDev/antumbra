import { fact } from "@antumbra/platform-feature/fact.ts";
import { MessageDelivered } from "@antumbra/platform-vocabulary/mail.ts";

export const messageDelivered = fact("MessageDelivered", MessageDelivered.fields);
