import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeArchivedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const changeArchived = fact("ChangeArchived", ChangeArchivedPayload.fields);
