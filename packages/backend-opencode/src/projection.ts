import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { rawEvent, rawOf } from "#mapping.ts";
import { openMessageAuthors } from "#message-authors.ts";
import { partEvents } from "#parts.ts";
import type { SessionFrame } from "#session-frames.ts";
import { openTurnBoundary } from "#turn-boundary.ts";

// why: opencode re-sends a part whole on every change, so the same words
// arrive many times over. The projection reports each thing once and holds
// what it has already said for as long as the session is attached.
const openFirstReport = (): ((key: string) => boolean) => {
	const reported = new Set<string>();
	return (key) => {
		if (reported.has(key)) {
			return false;
		}
		reported.add(key);
		return true;
	};
};

export interface SessionProjection {
	readonly events: (frame: SessionFrame) => AgentEvent[];
}

export const openSessionProjection = (): SessionProjection => {
	const authors = openMessageAuthors();
	const boundary = openTurnBoundary();
	const firstReport = openFirstReport();
	const project = (type: string, properties: unknown): AgentEvent[] => {
		const raw = rawOf(type, properties);
		switch (type) {
			case "message.updated":
				// why: a message announces who is speaking; what was said arrives as
				// its parts, so the announcement is remembered rather than journaled.
				authors.record(properties);
				return [];
			case "message.part.updated":
				return partEvents(raw, properties, authors, firstReport);
			// why: a delta is one token of a part the record will receive whole when
			// it settles. Journaling both would write every message twice, once a
			// syllable at a time.
			case "message.part.delta":
				return [];
			case "session.error":
				return boundary.errored(raw, properties);
			case "session.idle":
				return boundary.idled(raw);
			case "session.status":
				return boundary.status(raw, properties);
			default:
				return rawEvent(raw);
		}
	};
	return { events: (frame) => project(frame.type, frame.properties) };
};
