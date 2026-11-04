import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangePreparedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const changePrepared = fact("ChangePrepared", ChangePreparedPayload.fields);
