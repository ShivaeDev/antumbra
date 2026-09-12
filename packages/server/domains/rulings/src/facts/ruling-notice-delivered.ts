import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingNoticeDelivered = fact("RulingNoticeDelivered", { id: Schema.String, rulingId: RulingId });
