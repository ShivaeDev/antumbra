import type { FleetReading } from "#tools/voyages/fleet-reading.ts";
import { resolvedPart } from "#tools/voyages/role.ts";

const voyageLines = (voyage: FleetReading["voyages"][number]): readonly string[] => [
	[
		`- ${voyage.id} ${voyage.name} [${voyage.progress?.state ?? "quiet"}]`,
		voyage.kind,
		...voyage.roles.map((role) => resolvedPart(role.role, role.resolved)),
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
		...fleet.roles.map((role) => `- ${resolvedPart(role.role, role.resolved)}`),
	].join("\n");
