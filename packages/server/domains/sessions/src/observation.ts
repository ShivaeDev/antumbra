import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import type { observed } from "#facts/observed.ts";
import { SessionId } from "#ids.ts";
import { providerObservation } from "#provider-observation.ts";

export const observation = (entry: LogEntry): FactPayload<typeof observed> | null => {
	const event = entry.event;
	if (!("sessionId" in event)) return null;
	const base = {
		sessionId: SessionId.make(event.sessionId),
		nodeRef: null,
		origin: null,
		operationId: "requestId" in event ? event.requestId : null,
	};
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
		case "SessionInterrupted":
			return { ...base, evidence: { type: "interrupted", reason: "" } };
		case "SessionDetached":
			return { ...base, evidence: { type: "detached", reason: "" } };
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
		case "ProviderEvent":
			return providerObservation(event.event, base);
		default:
			return null;
	}
};
