import { fact } from "@antumbra/platform-feature/fact.ts";
import { VoyageFocusSet } from "@antumbra/platform-vocabulary/voyage.ts";

export const focusSet = fact("FocusSet", VoyageFocusSet.fields);
