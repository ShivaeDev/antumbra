import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeAdoptedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const changeAdopted = fact("ChangeAdopted", ChangeAdoptedPayload.fields);
