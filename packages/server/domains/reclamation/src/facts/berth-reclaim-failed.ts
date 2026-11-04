import { fact } from "@antumbra/platform-feature/fact.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { BerthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Schema } from "effect";

export const berthReclaimFailed = fact("BerthReclaimFailed", { id: BerthId, claimRequestId: Request, reason: Schema.String });
