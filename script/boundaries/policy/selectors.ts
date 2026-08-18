import { anyOf, packages } from "#boundaries/dsl.ts";

export const capabilities = packages.named(
	"domain-feeds",
	"pieces",
	"boards",
	"artifacts",
	"reports",
	"repos",
	"session-event-journal",
);

export const domainAndCapabilities = packages.named(
	"domain",
	"domain-feeds",
	"intent-demand",
	"pieces",
	"boards",
	"artifacts",
	"reports",
	"repos",
	"session-event-journal",
);

export const domainAndCapabilitiesExceptIntentDemand = anyOf(
	packages.named("domain"),
	capabilities,
);

export const agentBackends = packages.inFamily("backend");
export const runners = packages.inFamily("runner");
export const adapters = anyOf(agentBackends, packages.named("github"), runners);
