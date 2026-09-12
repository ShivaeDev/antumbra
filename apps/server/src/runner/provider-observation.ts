import type { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";

type Observation = FactPayload<typeof observed>;
export const providerObservation = (provider: AgentEvent, base: Omit<Observation, "evidence">): Observation => {
	const node = {
		...base,
		origin: "origin" in provider ? (provider.origin ?? null) : null,
		nodeRef: "origin" in provider ? (provider.origin?.node ?? null) : null,
	};
	switch (provider.type) {
		case "session.opened":
			return { ...node, evidence: { type: "native", nativeRef: provider.nativeRef } };
		case "session.state":
			return { ...node, evidence: { type: "activity", state: provider.state === "running" ? "active" : "idle" } };
		case "turn.completed":
			return { ...node, evidence: { type: "activity", state: "idle" } };
		case "session.background":
			return { ...node, evidence: { type: "background", count: provider.tasks.length } };
		case "subsession.opened":
			return {
				...node,
				evidence: {
					type: "opened",
					nativeRef: provider.subsessionRef,
					spawnedBy: provider.spawnedBy,
					parentRef: provider.parentRef ?? null,
					label: provider.label ?? null,
					kind: provider.kind ?? null,
				},
			};
		case "subsession.ended":
			return { ...node, evidence: { type: "closed", nativeRef: provider.subsessionRef, outcome: provider.outcome } };
		case "subsession.gap":
			return { ...node, evidence: { type: "gap", kind: provider.gapKind, detail: provider.detail ?? provider.gapKind } };
		case "tool.started":
			return { ...node, evidence: { type: "tool-called", callId: provider.toolId, name: provider.name, input: provider.input } };
		case "tool.completed":
			return { ...node, evidence: { type: "tool-answered", callId: provider.toolId, answer: null } };
		default:
			return { ...node, evidence: { type: "node-seen" } };
	}
};
