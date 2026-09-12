import { fact } from "@antumbra/platform-feature/fact.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Schema } from "effect";
import { BerthId } from "#ids.ts";

export const berthReclaimFailed = fact("BerthReclaimFailed", { id: BerthId, claimRequestId: Request, reason: Schema.String });
