import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { berth } from "@antumbra/domain-reclamation/rows/berth.ts";
import { moorage } from "@antumbra/domain-reclamation/rows/moorage.ts";
export const claimRows = [berth, moorage, agent] as const;
