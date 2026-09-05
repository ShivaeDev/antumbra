import { Database } from "@antumbra/persistence";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { AGENT_ROLES, type AgentRole } from "@antumbra/vocabulary/agent-role";
import { Effect } from "effect";
import { type AgentSettingsChoice, FLEET_SCOPE, type ResolvedAgentSettings, UNCHOSEN } from "#roles/choice.ts";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

interface StoredChoice extends AgentSettingsChoice {
	readonly role: string;
	readonly scope: string;
}

const rowsFor = (scopes: ReadonlyArray<string>) => Effect.flatMap(Database, (db) => db.AgentRoleSettings.where((row) => row.scope.in(scopes)).all());

const chosen = (rows: ReadonlyArray<StoredChoice>, scope: string, role: AgentRole): AgentSettingsChoice => {
	const row = rows.find((candidate) => candidate.scope === scope && candidate.role === role);
	return row === undefined ? UNCHOSEN : { backend: row.backend, effort: row.effort, model: row.model };
};

export const readRoleDefaults = Effect.fn("RoleSettings.defaults")(function* () {
	const rows = yield* rowsFor([FLEET_SCOPE]);
	return AGENT_ROLES.map((role) => ({ ...chosen(rows, FLEET_SCOPE, role), role }));
});

export interface VoyageAgentSettings {
	readonly captain: AgentSettingsChoice;
	readonly crew: AgentSettingsChoice;
}

export const readVoyageSettings = Effect.fn("RoleSettings.forVoyages")(function* (voyageIds: ReadonlyArray<string>) {
	const rows = yield* rowsFor(voyageIds);
	return new Map(
		voyageIds.map((voyageId) => [
			voyageId,
			{ captain: chosen(rows, voyageId, "captain"), crew: chosen(rows, voyageId, "crew") } satisfies VoyageAgentSettings,
		]),
	);
});

export const resolveRoleSettings = Effect.fn("RoleSettings.resolve")(function* (voyageId: string | null, role: AgentRole) {
	const rows = yield* rowsFor(voyageId === null ? [FLEET_SCOPE] : [FLEET_SCOPE, voyageId]);
	const override = voyageId === null ? UNCHOSEN : chosen(rows, voyageId, role);
	const standing = chosen(rows, FLEET_SCOPE, role);
	const sailsOn = standing.backend ?? FIRST_BACKEND;
	const backend = override.backend ?? sailsOn;
	const inherited = backend === sailsOn ? standing : UNCHOSEN;
	const effort = override.effort ?? inherited.effort;
	const model = override.model ?? inherited.model;
	return {
		backend,
		...(effort === null ? {} : { effort }),
		...(model === null ? {} : { model }),
	} satisfies ResolvedAgentSettings;
});
