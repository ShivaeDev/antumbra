import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeProposalFrozenPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const proposalFrozen = fact("ChangeProposalFrozen", ChangeProposalFrozenPayload.fields);
