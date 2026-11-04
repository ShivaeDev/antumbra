import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeDismissedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const changeDismissed = fact("ChangeDismissed", ChangeDismissedPayload.fields);
