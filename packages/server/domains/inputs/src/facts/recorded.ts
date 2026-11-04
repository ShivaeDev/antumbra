import { fact } from "@antumbra/platform-feature/fact.ts";
import { InputRecordedPayload } from "@antumbra/platform-vocabulary/inputs-event.ts";
export const inputRecorded = fact("InputRecorded", InputRecordedPayload.fields);
