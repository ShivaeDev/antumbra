import { fact } from "@antumbra/platform-feature/fact.ts";
import { InputRetriedPayload } from "@antumbra/platform-vocabulary/inputs-event.ts";
export const inputRetried = fact("InputRetried", InputRetriedPayload.fields);
