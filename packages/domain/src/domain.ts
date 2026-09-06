import { ChangeHeldResourceReadLive } from "@antumbra/changes";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { BackendCapacitiesLive } from "@antumbra/provider-capacity";
import { ResourceReclaimRunnersLive, type ResourceReconcileOptions, ResourceReconcilerLive } from "@antumbra/resource-reclamation";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { sessionInputsLayer } from "@antumbra/session-inputs";
import { LiveDelegationsLive } from "@antumbra/sessions";
import { CurrentSessions } from "@antumbra/sessions/current/service";
import { SessionInputDelivery } from "@antumbra/sessions/input-delivery/service";
import { SessionRecoveryContexts } from "@antumbra/sessions/recovery/contexts/service";
import { sessionSendLayer } from "@antumbra/sessions/send/layer";
import { SessionNodeReconciler } from "@antumbra/sessions/tree/reconcile/service";
import { SessionTreeSinks } from "@antumbra/sessions/tree/sink/service";
import { Layer } from "effect";
import { makeAgentDomain } from "#agent-domain-assembly.ts";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendProviders } from "#backend-catalog/providers.ts";
import { BackendCatalog } from "#backend-catalog/service.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { HoldWaits } from "#hold-waits/service.ts";
import { imageInputBackendsOf } from "#image-input-backends.ts";
import { MailDelivery } from "#mail-delivery/service.ts";
import { AgentToolCompiler } from "#tool-compiler/service.ts";

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
		Layer.provideMerge(AgentToolCompiler.layer),
		Layer.provideMerge(SessionTreeSinks.layer),
		Layer.provideMerge(sessionSendLayer(imageInputBackendsOf(backends))),
		Layer.provideMerge(SessionInputDelivery.layer),
		Layer.provideMerge(SessionRecoveryContexts.layer),
		Layer.provideMerge(CurrentSessions.layer),
		Layer.provideMerge(SessionNodeReconciler.layer),
		Layer.provideMerge(HoldWaits.layer),
		Layer.provideMerge(MailDelivery.layer),
		Layer.provideMerge(BackendCatalog.layer.pipe(Layer.provide(Layer.succeed(BackendProviders)(backends)))),
		Layer.provideMerge(LiveDelegationsLive),
		Layer.provideMerge(BackendCapacitiesLive(backends)),
		Layer.provideMerge(
			ResourceReconcilerLive(reclaimOptions).pipe(Layer.provide(ChangeHeldResourceReadLive), Layer.provide(ResourceReclaimRunnersLive(runners))),
		),
		Layer.provideMerge(capabilities),
		Layer.provideMerge(SessionFabricLive),
		Layer.provideMerge(sessionInputsLayer(sessionInputsDirectory)),
	);
};
