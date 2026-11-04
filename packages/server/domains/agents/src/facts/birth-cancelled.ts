import { fact } from "@antumbra/platform-feature/fact.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
export const birthCancelled = fact("BirthCancelled", { id: BirthId });
