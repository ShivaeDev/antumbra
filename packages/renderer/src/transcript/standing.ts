import type { SessionEvent } from "@antumbra/contract";
import type { AgentEvent, BackgroundTask, SessionState, UsageEvent } from "@antumbra/vocabulary/session-events";

export interface SessionStanding {
	readonly background: ReadonlyArray<BackgroundTask>;
	readonly state: SessionState | undefined;
	readonly usage: typeof UsageEvent.Type | undefined;
}

const EMPTY: SessionStanding = {
	background: [],
	state: undefined,
	usage: undefined,
};

// why: only the session's own frames say what the session is doing. An event
// carrying attribution came from a subsession, and letting a delegate's turn
// ending set the root's state would show a session resting while it waits.
const stepped = (standing: SessionStanding, event: AgentEvent): SessionStanding => {
	if ("origin" in event && event.origin !== undefined) {
		return standing;
	}
	if (event.type === "session.state") {
		return { ...standing, state: event.state };
	}
	if (event.type === "session.background") {
		return { ...standing, background: event.tasks };
	}
	return event.type === "usage" ? { ...standing, usage: event } : standing;
};

// why: the journal is the whole of the answer, so the standing is folded from
// it rather than tracked in the window. A reader who reopens a session, or
// opens it in a second window, sees the same state and the same background set
// the record already holds — nothing here depends on having watched it happen.
export const sessionStanding = (events: ReadonlyArray<SessionEvent>): SessionStanding =>
	events.reduce((standing, row) => (row.event._tag === "Known" ? stepped(standing, row.event.event) : standing), EMPTY);
