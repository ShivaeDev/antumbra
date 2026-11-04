import { fact } from "@antumbra/platform-feature/fact.ts";
import { CountSetPayload } from "@antumbra/platform-vocabulary/settings-event.ts";

export const countSet = fact("CountSet", CountSetPayload.fields);
