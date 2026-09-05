import { Database } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { Clock, Effect } from "effect";
import { costsView } from "#costs/view.ts";

export const makeCostsRead = Effect.gen(function* () {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	return Effect.fnUntraced(function* () {
		const readings = yield* journal.usage();
		const sessionIds = [...new Set(readings.map((reading) => reading.sessionId))];
		const sessions = yield* db.AgentSession.where((session) => session.id.in(sessionIds)).all();
		const agentIds = [...new Set(sessions.map((session) => session.agentId))];
		const crews = yield* db.VoyageAgent.where((crew) => crew.agentId.in(agentIds)).all();
		const voyages = yield* db.Voyage.where((voyage) => voyage.id.in(crews.map((crew) => crew.voyageId))).all();
		return costsView({
			now: new Date(yield* Clock.currentTimeMillis),
			readings,
			sessions: new Map(sessions.map((session) => [session.id, session])),
			voyageNames: new Map(voyages.map((voyage) => [voyage.id, voyage.name])),
			voyageOfAgent: new Map(crews.map((crew) => [crew.agentId, crew.voyageId])),
		});
	});
});
