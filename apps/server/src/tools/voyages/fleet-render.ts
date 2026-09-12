import type { FleetReading } from "#tools/voyages/fleet-reading.ts";
import { rolePart } from "#tools/voyages/role.ts";

const UNCHOSEN = { backend: null, model: null, effort: null };

const voyageLines = (voyage: FleetReading["voyages"][number]): readonly string[] => [
	[
		`- ${voyage.id} ${voyage.name} [${voyage.progress?.state ?? "quiet"}]`,
		voyage.kind,
		rolePart("captain", voyage.roles.find((role) => role.role === "captain") ?? UNCHOSEN, "as the fleet sets it"),
		rolePart("crew", voyage.roles.find((role) => role.role === "crew") ?? UNCHOSEN, "as the fleet sets it"),
		`${voyage.progress?.total ?? 0} pieces (${voyage.progress?.counts.held ?? 0} unlaunched, ${voyage.progress?.counts.parked ?? 0} parked, ${voyage.progress?.counts.done ?? 0} landed)`,
		voyage.captain === null ? "captain none" : `captain ${voyage.captain.id} [${voyage.captain.status}]`,
		!voyage.progress?.lastStirredAt ? "never stirred" : `last stirred ${voyage.progress.lastStirredAt}`,
	].join(" · "),
	`  north star: ${voyage.northStar}`,
];

export const renderFleet = (fleet: FleetReading): string =>
	[
		"# Fleet",
		"",
		...fleet.voyages.flatMap(voyageLines),
		"",
		"# Repositories",
		"",
		...fleet.repos.map((repo) => `- ${repo.id} ${repo.name} · ${repo.source} · default ref ${repo.defaultRef}`),
		"",
		"# Backends",
		"",
		...fleet.backends.flatMap((backend) => [
			`- ${backend.tag}`,
			...backend.models.map((model) => `  ${model.model}${model.isDefault ? " (default)" : ""} · efforts ${model.efforts.join(", ")}`),
		]),
		"",
		"# Roles",
		"",
		...fleet.roles.map((role) => `- ${rolePart(role.role, role, "unnamed")}`),
	].join("\n");
