import { fact } from "@antumbra/platform-feature/fact.ts";
import { change } from "#rows/change.ts";
export const proposalFrozen = fact("ChangeProposalFrozen", { change: change.Row });
