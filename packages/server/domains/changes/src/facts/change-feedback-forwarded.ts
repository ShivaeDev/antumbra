import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeFeedbackForwardedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const changeFeedbackForwarded = fact("ChangeFeedbackForwarded", ChangeFeedbackForwardedPayload.fields);
