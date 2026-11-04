import { row } from "@antumbra/platform-feature/row.ts";
import { AdoptionRequest } from "@antumbra/platform-vocabulary/changes.ts";
export const adoptionRequest = row("changeAdoptionRequest", AdoptionRequest.fields, { key: "id" });
