import type { AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import * as Id from "@antumbra/vocabulary/id.ts";

export const FLEET = "fleet";

export const RoleSettingId = Id.brand("RoleSettingId");
export type RoleSettingId = typeof RoleSettingId.Type;

export const roleSettingId = (scope: string, role: AgentRole): RoleSettingId => RoleSettingId.make(`${scope}/${role}`);
