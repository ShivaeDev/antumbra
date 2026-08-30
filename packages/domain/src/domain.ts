import { ChangeHeldResourceReadLive } from "@antumbra/changes";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { ResourceReclaimRunnersLive, type ResourceReconcileOptions, ResourceReconcilerLive } from "@antumbra/resource-reclamation";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { SessionInputsLive } from "@antumbra/session-inputs";
import { LiveDelegationsLive } from "@antumbra/sessions";
import { Layer } from "effect";
import { makeAgentDomain } from "#agent-domain-assembly.ts";
import { AgentDomain } from "#agent-domain-service.ts";
import { domainCapabilities } from "#domain-capabilities.ts";

export { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";

// why: built before the kernel starts — the first resource pass must resume
// durable claims before admission can authorize more work through them.
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
		// why: one registry for the whole domain, not one per sink — the readers
		// that ask which trees are delegating are nowhere near the streams that
		// answer, so the Layer is what makes it the same set on both sides.
		Layer.provide(LiveDelegationsLive),
		Layer.provide(
			ResourceReconcilerLive(reclaimOptions).pipe(Layer.provide(ChangeHeldResourceReadLive), Layer.provide(ResourceReclaimRunnersLive(runners))),
		),
		Layer.provideMerge(capabilities),
		// why: the fabric stands under the capabilities as well as over them —
		// standing down is a durable declaration and a runtime mark made in the
		// same act, so the tool that makes it needs the same attachment registry
		// the domain does.
		Layer.provide(SessionFabricLive),
		Layer.provideMerge(SessionInputsLive(sessionInputsDirectory)),
	);
};
