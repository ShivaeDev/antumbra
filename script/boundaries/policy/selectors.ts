import { anyOf, packages } from "#boundaries/dsl.ts";

export const capabilities = packages.named(
	"domain-feeds",
	"provider-capacity",
	"changes",
	"pieces",
	"voyages",
	"boards",
	"artifacts",
	"reports",
	"repos",
	"resource-reclamation",
	"rulings",
	"session-event-journal",
	"session-fabric",
	"session-inputs",
	"sessions",
	"settings",
);

export const domainAndCapabilities = packages.named(
	"domain",
	"domain-feeds",
	"provider-capacity",
	"changes",
	"intent-demand",
	"pieces",
	"voyages",
	"boards",
	"artifacts",
	"reports",
	"repos",
	"resource-reclamation",
	"rulings",
	"session-event-journal",
	"session-fabric",
	"session-inputs",
	"sessions",
	"settings",
);

export const domainAndCapabilitiesExceptIntentDemand = anyOf(packages.named("domain"), capabilities);

export const agentBackends = packages.inFamily("backend");
export const runners = packages.inFamily("runner");
export const adapters = anyOf(agentBackends, packages.named("github"), runners);
