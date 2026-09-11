import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const FLEET = "fleet";

export const RoleSettingId = Id.brand("RoleSettingId");
export type RoleSettingId = typeof RoleSettingId.Type;

export const roleSettingId = (scope: string, role: AgentRole): RoleSettingId => RoleSettingId.make(`${scope}/${role}`);
