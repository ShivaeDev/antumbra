import { fact } from "@antumbra/platform-feature/fact.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { BerthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";

export const berthReclaimed = fact("BerthReclaimed", { id: BerthId, claimRequestId: Request });
