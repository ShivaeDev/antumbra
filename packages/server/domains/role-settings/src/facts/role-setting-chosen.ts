import { fact } from "@antumbra/platform-feature/fact.ts";
import { RoleSettingChosenPayload } from "@antumbra/platform-vocabulary/role-settings-event.ts";

export const roleSettingChosen = fact("RoleSettingChosen", RoleSettingChosenPayload.fields);
