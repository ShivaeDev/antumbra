import { Database } from "@antumbra/persistence";
import { SessionRegistration } from "@antumbra/sessions/registration/service";
import { Effect } from "effect";

interface SmootherRegistration {
	readonly agentId: string;
	readonly backend: string;
	readonly cwd: string;
	readonly sessionId: string;
}

export const registerSession = Effect.fn("SmootherLifecycle.registerSession")(function* (session: SmootherRegistration) {
	const db = yield* Database;
	const registration = yield* SessionRegistration;
	yield* db.Agent.where({ id: session.agentId }).update({ currentSessionId: session.sessionId });
	yield* registration.ensureRoot(session, session.cwd);
});
