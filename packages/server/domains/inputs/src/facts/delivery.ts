import { fact } from "@antumbra/platform-feature/fact.ts";
import { InputDeliveryChangedPayload } from "@antumbra/platform-vocabulary/inputs-event.ts";
export const inputDeliveryChanged = fact("InputDeliveryChanged", InputDeliveryChangedPayload.fields);
