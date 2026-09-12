import { fact } from "@antumbra/platform-feature/fact.ts";
import { BirthId } from "#ids.ts";
export const birthCancelled = fact("BirthCancelled", { id: BirthId });
