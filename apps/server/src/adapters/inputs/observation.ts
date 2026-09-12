import type { inputObserved } from "@antumbra/domain-inputs/facts/observed.ts";
import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
export const inputObservation = (entry: LogEntry): FactPayload<typeof inputObserved> | null => {
	const event = entry.event;
	switch (event.type) {
		case "InputAccepted":
			return { sessionId: event.sessionId, inputId: event.inputId, operationId: event.requestId, status: "accepted", detail: null };
		case "InputFailed":
			return { sessionId: event.sessionId, inputId: event.inputId, operationId: event.requestId, status: "refused", detail: event.reason };
		case "InputAmbiguous":
			return { sessionId: event.sessionId, inputId: event.inputId, operationId: event.requestId, status: "ambiguous", detail: event.reason };
		default:
			return null;
	}
};
