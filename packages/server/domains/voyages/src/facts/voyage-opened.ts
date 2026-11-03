import { fact } from "@antumbra/platform-feature/fact.ts";
import { VoyageOpened } from "@antumbra/platform-vocabulary/voyage.ts";

export const voyageOpened = fact("VoyageOpened", VoyageOpened.fields);
