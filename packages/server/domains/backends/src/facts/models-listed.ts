import { fact } from "@antumbra/platform-feature/fact.ts";
import { ModelsListedPayload } from "@antumbra/platform-vocabulary/backends-event.ts";

export const modelsListed = fact("ModelsListed", ModelsListedPayload.fields, { subject: "backend" });
