import { fact } from "@antumbra/platform-feature/fact.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { BerthId } from "#ids.ts";

export const berthReclaimed = fact("BerthReclaimed", { id: BerthId, claimRequestId: Request });
