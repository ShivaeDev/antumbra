import { fact } from "@antumbra/platform-feature/fact.ts";
import { BerthId } from "#ids.ts";

export const berthReclaimed = fact("BerthReclaimed", { id: BerthId });
