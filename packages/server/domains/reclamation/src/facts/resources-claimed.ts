import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { BerthId } from "#ids.ts";

export const resourcesClaimed = fact("ResourcesClaimed", { agentId: Schema.String, berthIds: Schema.Array(BerthId) });
