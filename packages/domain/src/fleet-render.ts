import type { RoleSettings } from "@antumbra/contract";
import type { ModelChoice } from "@antumbra/plugin-api";
import type { RegisteredRepo } from "@antumbra/repos";
import type { AgentSettingsChoice } from "@antumbra/settings";
import { Option } from "effect";
import type { VoyageCaptain } from "#voyage-captain.ts";
import type { PieceCounts, VoyageSummary } from "#voyage-view.ts";

export interface FleetBackend {
	readonly models: ReadonlyArray<ModelChoice>;
	readonly tag: string;
}

export interface FleetReading {
	readonly backends: ReadonlyArray<FleetBackend>;
	readonly repos: ReadonlyArray<RegisteredRepo>;
	readonly roles: ReadonlyArray<RoleSettings>;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}

const countsPart = (counts: PieceCounts): string => {
	const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
	return `${total} pieces (${counts.held} unlaunched, ${counts.parked} parked, ${counts.done} landed)`;
};

const captainPart = (captain: Option.Option<VoyageCaptain>): string =>
	Option.match(captain, {
		onNone: () => "captain none",
		onSome: (row) => `captain ${row.agentId} [${row.status}]`,
	});

const stirredPart = (at: Date | null): string => (at === null ? "never stirred" : `last stirred ${at.toISOString()}`);

const settingsPart = (settings: AgentSettingsChoice): ReadonlyArray<string> => [
	...(settings.backend === null ? [] : [`on ${settings.backend}`]),
	...(settings.model === null ? [] : [`with ${settings.model}`]),
	...(settings.effort === null ? [] : [`at ${settings.effort} effort`]),
];

export const rolePart = (role: string, settings: AgentSettingsChoice, unnamed: string): string => {
	const named = settingsPart(settings);
	return named.length === 0 ? `${role} ${unnamed}` : [role, ...named].join(" ");
};

const voyageLines = (voyage: VoyageSummary): ReadonlyArray<string> => [
	[
		`- ${voyage.id} ${voyage.name} [${voyage.state}]`,
		voyage.kind,
		rolePart("captain", voyage.captainSettings, "as the fleet sets it"),
		rolePart("crew", voyage.crewSettings, "as the fleet sets it"),
		countsPart(voyage.counts),
		captainPart(voyage.captain),
		stirredPart(voyage.lastStirredAt),
	].join(" · "),
	`  north star: ${voyage.northStar}`,
];

const repoLine = (repo: RegisteredRepo): string => `- ${repo.id} ${repo.name} · ${repo.source} · default ref ${repo.defaultRef}`;

const modelLine = (model: ModelChoice): string => `  ${model.id}${model.isDefault ? " (default)" : ""} · efforts ${model.efforts.join(", ")}`;

const backendLines = (backend: FleetBackend): ReadonlyArray<string> => [`- ${backend.tag}`, ...backend.models.map(modelLine)];

const roleLine = (role: RoleSettings): string => `- ${rolePart(role.role, role, "unnamed")}`;

export const renderFleet = (fleet: FleetReading): string =>
	[
		"# Fleet",
		"",
		...fleet.voyages.flatMap(voyageLines),
		"",
		"# Repositories",
		"",
		...fleet.repos.map(repoLine),
		"",
		"# Backends",
		"",
		...fleet.backends.flatMap(backendLines),
		"",
		"# Roles",
		"",
		"Every voyage sails on these unless it names its own. An unnamed setting falls to the first backend and the backend's own choice.",
		"",
		...fleet.roles.map(roleLine),
	].join("\n");
