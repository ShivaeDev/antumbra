import { fact } from "@antumbra/platform-feature/fact.ts";
import { InputDeliveryObservedPayload } from "@antumbra/platform-vocabulary/inputs-event.ts";
export const inputObserved = fact("InputDeliveryObserved", InputDeliveryObservedPayload.fields);
