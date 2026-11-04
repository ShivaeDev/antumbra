import { fact } from "@antumbra/platform-feature/fact.ts";
import { BerthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Schema } from "effect";

export const resourcesClaimed = fact("ResourcesClaimed", { agentId: Schema.String, berthIds: Schema.Array(BerthId) });
