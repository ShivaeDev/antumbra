import { ChangeHeldResourceReadLive } from "@antumbra/changes";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { BackendCapacitiesLive } from "@antumbra/provider-capacity";
import { ResourceReclaimRunnersLive, type ResourceReconcileOptions, ResourceReconcilerLive } from "@antumbra/resource-reclamation";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { sessionInputsLayer } from "@antumbra/session-inputs";
import { LiveDelegationsLive } from "@antumbra/sessions";
import { CurrentSessions } from "@antumbra/sessions/current/service";
import { sessionSendLayer } from "@antumbra/sessions/send/layer";
import { Layer } from "effect";
import { makeAgentDomain } from "#agent-domain-assembly.ts";
import { AgentDomain } from "#agent-domain-service.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { imageInputBackendsOf } from "#image-input-backends.ts";

export { AgentDomain } from "#agent-domain-service.ts";

export const AgentDomainLive = (
	backends: ReadonlyMap<string, AgentBackend>,
	runners: ReadonlyMap<string, Runner>,
	changeHosts: ReadonlyMap<string, ChangeHost>,
	artifactsDirectory: string,
	sessionInputsDirectory: string,
	reclaimOptions: Partial<ResourceReconcileOptions> = {},
) => {
	const capabilities = domainCapabilities(changeHosts, runners, artifactsDirectory);
	return Layer.effect(AgentDomain)(makeAgentDomain(backends, runners)).pipe(
		Layer.provideMerge(sessionSendLayer(imageInputBackendsOf(backends))),
		Layer.provideMerge(CurrentSessions.layer),
		Layer.provideMerge(LiveDelegationsLive),
		Layer.provideMerge(BackendCapacitiesLive(backends)),
		Layer.provide(
			ResourceReconcilerLive(reclaimOptions).pipe(Layer.provide(ChangeHeldResourceReadLive), Layer.provide(ResourceReclaimRunnersLive(runners))),
		),
		Layer.provideMerge(capabilities),
		Layer.provideMerge(SessionFabricLive),
		Layer.provideMerge(sessionInputsLayer(sessionInputsDirectory)),
	);
};
