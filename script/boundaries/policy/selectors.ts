import { anyOf, packages } from "#boundaries/dsl.ts";

export const capabilities = packages.named(
	"domain-feeds",
	"changes",
	"pieces",
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
);

export const domainAndCapabilities = packages.named(
	"domain",
	"domain-feeds",
	"changes",
	"intent-demand",
	"pieces",
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
);

export const domainAndCapabilitiesExceptIntentDemand = anyOf(
	packages.named("domain"),
	capabilities,
);

export const agentBackends = packages.inFamily("backend");
export const runners = packages.inFamily("runner");
export const adapters = anyOf(agentBackends, packages.named("github"), runners);
