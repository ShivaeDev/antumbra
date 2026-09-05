import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { AgentRole, VoyageAgentRole } from "@antumbra/vocabulary/agent-role";
import { Clock, Effect } from "effect";
import { type AgentSettingsChoice, FLEET_SCOPE } from "#roles/choice.ts";

const write = Effect.fnUntraced(function* (scope: string, role: AgentRole, choice: AgentSettingsChoice) {
	const db = yield* Database;
	const now = yield* Clock.currentTimeMillis;
	const updated = yield* db.AgentRoleSettings.where({ role, scope }).update({ ...choice, updatedAt: new Date(now) });
	if (updated === null) {
		yield* db.AgentRoleSettings.create({ ...choice, role, scope });
	}
});

export const changeRoleDefault = Effect.fn("RoleSettings.changeDefault")(function* (role: AgentRole, choice: AgentSettingsChoice) {
	yield* write(FLEET_SCOPE, role, choice);
	yield* (yield* DomainFeeds).publishFleetRefresh();
});

export const changeVoyageRole = Effect.fn("RoleSettings.changeForVoyage")(function* (
	voyageId: string,
	role: VoyageAgentRole,
	choice: AgentSettingsChoice,
) {
	yield* write(voyageId, role, choice);
	yield* (yield* DomainFeeds).publishVoyageRefresh();
});
