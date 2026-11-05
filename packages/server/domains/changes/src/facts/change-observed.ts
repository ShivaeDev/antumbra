import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeObservedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const changeObserved = fact("ChangeObserved", ChangeObservedPayload.fields);
