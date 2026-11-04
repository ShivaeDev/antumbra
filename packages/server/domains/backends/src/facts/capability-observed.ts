import { fact } from "@antumbra/platform-feature/fact.ts";
import { CapabilityObservedPayload } from "@antumbra/platform-vocabulary/backends-event.ts";

export const capabilityObserved = fact("CapabilityObserved", CapabilityObservedPayload.fields, { subject: "backend" });
