import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import type { inputObserved } from "#facts/observed.ts";
export const inputObservation = (entry: LogEntry): FactPayload<typeof inputObserved> | null => {
	const event = entry.event;
	switch (event.type) {
		case "InputAccepted":
			return { sessionId: event.sessionId, inputId: event.inputId, status: "accepted", detail: null };
		case "InputFailed":
			return { sessionId: event.sessionId, inputId: event.inputId, status: "refused", detail: event.reason };
		case "InputAmbiguous":
			return { sessionId: event.sessionId, inputId: event.inputId, status: "ambiguous", detail: event.reason };
		default:
			return null;
	}
};
