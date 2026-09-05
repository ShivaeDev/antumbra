import { Database } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { Clock, Effect } from "effect";
import { costsView } from "#costs/view.ts";

export const makeCostsRead = Effect.gen(function* () {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	return Effect.fnUntraced(function* () {
		const readings = yield* journal.usage();
		const sessions = yield* db.AgentSession.all();
		const crews = yield* db.VoyageAgent.all();
		const voyages = yield* db.Voyage.all();
		return costsView({
			now: new Date(yield* Clock.currentTimeMillis),
			readings,
			sessions: new Map(sessions.map((session) => [session.id, { agentId: session.agentId, backend: session.backend }])),
			voyageNames: new Map(voyages.map((voyage) => [voyage.id, voyage.name])),
			voyageOfAgent: new Map(crews.map((crew) => [crew.agentId, crew.voyageId])),
		});
	});
});
