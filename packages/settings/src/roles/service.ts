import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { changeRoleDefault, changeVoyageRole } from "#roles/change.ts";
import { readRoleDefaults, readVoyageSettings, resolveRoleSettings } from "#roles/read.ts";

export const RoleSettings = defineService({
	id: "@antumbra/settings/RoleSettings",
	initialize: Effect.void,
	methods: () => ({
		changeDefault: changeRoleDefault,
		changeForVoyage: changeVoyageRole,
		defaults: readRoleDefaults,
		forVoyages: readVoyageSettings,
		resolve: resolveRoleSettings,
	}),
	requires: [Database, DomainFeeds],
});

export const RoleSettingsLive = RoleSettings.layer;
