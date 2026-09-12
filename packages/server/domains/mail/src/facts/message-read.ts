import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { MessageId } from "#ids.ts";

export const messageRead = fact("MessageRead", { ids: Schema.Array(MessageId), readAt: Schema.String });
