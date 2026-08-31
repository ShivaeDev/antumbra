import { DomainFeeds } from "@antumbra/domain-feeds";
import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { requireSiestaSucceeded, rootSessions, SessionShutdown } from "@antumbra/sessions";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Layer, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";

const makeSessionShutdownDrain = Effect.gen(function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const feeds = yield* DomainFeeds;
	const kernel = yield* Kernel;
	const markActiveSessionsDraining = Effect.gen(function* () {
		const sessions = yield* db.AgentSession.where(rootSessions).all();
		const draining: Array<string> = [];
		for (const session of sessions) {
			const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status));
			if (status !== "open") {
				continue;
			}
			const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus));
			if (executionStatus === "idle") {
				continue;
			}
			draining.push(session.id);
			if (executionStatus === "active") {
				yield* db.AgentSession.where({
					executionStatus: "active",
					id: session.id,
					status: "open",
				}).update({ executionStatus: "draining" });
			}
		}
		return draining;
	});
	const announce = Effect.all([feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()], { concurrency: 1 }).pipe(Effect.asVoid);
	const waitForSiesta = (sessionId: string, intentId: string) =>
		kernel.changes(intentId).pipe(
			Stream.takeUntil(isTerminalIntentStatus),
			Stream.runLast,
			Effect.flatMap((status) => requireSiestaSucceeded(intentId, sessionId, status)),
		);
	const drainOpenSessions = Effect.gen(function* () {
		while (true) {
			const sessionIds = yield* markActiveSessionsDraining;
			if (sessionIds.length === 0) {
				return;
			}
			yield* announce;
			const siestas = yield* kernel.active(domain.siesta);
			const drainSession = (sessionId: string) => {
				const current = siestas.filter((intent) => intent.payload.sessionId === sessionId);
				return Effect.gen(function* () {
					const intents = current.length > 0 ? current : [yield* kernel.submit(domain.siesta, { sessionId })];
					yield* Effect.forEach(intents, (intent) => waitForSiesta(sessionId, intent.id), { concurrency: "unbounded" });
				});
			};
			yield* Effect.forEach(sessionIds, drainSession, {
				concurrency: "unbounded",
			});
		}
	});
	// A refused quit can leave the application running, so the drain always reopens Session starts.
	return domain.closeSessionStarts.pipe(Effect.andThen(drainOpenSessions), Effect.ensuring(domain.reopenSessionStarts));
});

export const SessionShutdownLive = Layer.effect(SessionShutdown)(makeSessionShutdownDrain.pipe(Effect.map((drain) => SessionShutdown.of({ drain }))));
