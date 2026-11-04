import type { AgentRole } from "#agent-role.ts";
import * as Id from "#id.ts";

export const FLEET = "fleet";

export const RoleSettingId = Id.brand("RoleSettingId");
export type RoleSettingId = typeof RoleSettingId.Type;

export const roleSettingId = (scope: string, role: AgentRole): RoleSettingId => RoleSettingId.make(`${scope}/${role}`);
