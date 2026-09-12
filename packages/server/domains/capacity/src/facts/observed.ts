import { fact } from "@antumbra/platform-feature/fact.ts";
import { capacity } from "#rows/capacity.ts";

export const capacityObserved = fact("CapacityObserved", capacity.fields);
