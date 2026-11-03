import { fact } from "@antumbra/platform-feature/fact.ts";
import { VoyageQuietSet } from "@antumbra/platform-vocabulary/voyage.ts";

export const quietSet = fact("QuietSet", VoyageQuietSet.fields);
