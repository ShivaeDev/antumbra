import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { MessageId } from "#ids.ts";

export const messageDelivered = fact("MessageDelivered", { ids: Schema.Array(MessageId), deliveredAt: Schema.String });
