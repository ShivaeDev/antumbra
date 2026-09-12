import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import type { observed } from "#facts/observed.ts";
import { SessionId } from "#ids.ts";

export const observation = (entry: LogEntry): FactPayload<typeof observed> | null => {
	const event = entry.event;
	if (!("sessionId" in event)) return null;
	const base = { sessionId: SessionId.make(event.sessionId), nodeRef: null, operationId: "requestId" in event ? event.requestId : null };
	switch (event.type) {
		case "SessionStarted":
			return {
				...base,
				evidence: {
					type: "started",
					agentId: event.agentId,
					backend: event.backend,
					cwd: event.cwd,
					nativeRef: event.nativeRef,
					runnerId: event.runnerId,
					toolSetVersion: event.toolSetVersion,
				},
			};
		case "SessionWoke":
			return { ...base, evidence: { type: "woke", runnerId: event.runnerId } };
		case "SessionSlept":
			return { ...base, evidence: { type: "slept", reason: "" } };
		case "SessionEnded":
			return { ...base, evidence: { type: "ended", reason: event.reason } };
		case "SessionFailed":
			return { ...base, evidence: { type: "failed", reason: event.reason } };
		case "InputAccepted":
			return { ...base, evidence: { type: "input-accepted", inputId: event.inputId } };
		case "ToolCalled":
			return { ...base, evidence: { type: "tool-called", callId: event.callId, name: event.name, input: JSON.stringify(event.input) } };
		case "ToolAnswered":
			return { ...base, evidence: { type: "tool-answered", callId: event.callId } };
		case "ProviderEvent": {
			const provider = event.event;
			const node = { ...base, nodeRef: "origin" in provider ? (provider.origin?.node ?? null) : null };
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
							parentRef: provider.parentRef ?? null,
							label: provider.label ?? null,
							kind: provider.kind ?? null,
						},
					};
				case "subsession.ended":
					return { ...node, evidence: { type: "closed", nativeRef: provider.subsessionRef, outcome: provider.outcome } };
				case "subsession.gap":
					return { ...node, evidence: { type: "gap", detail: provider.detail ?? provider.gapKind } };
				case "tool.started":
					return { ...node, evidence: { type: "tool-called", callId: provider.toolId, name: provider.name, input: provider.input } };
				case "tool.completed":
					return { ...node, evidence: { type: "tool-answered", callId: provider.toolId } };
				default:
					return null;
			}
		}
		default:
			return null;
	}
};
