import { fact } from "@antumbra/platform-feature/fact.ts";
import { FlagSetPayload } from "@antumbra/platform-vocabulary/settings-event.ts";

export const flagSet = fact("FlagSet", FlagSetPayload.fields);
