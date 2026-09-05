import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { SessionFabric } from "@antumbra/session-fabric";
import { requireSiestaSucceeded } from "@antumbra/sessions";
import { SessionDrain } from "@antumbra/sessions/drain/service";
import { Effect, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";

export const drainSessions = Effect.fn("SessionShutdown.drain")(function* () {
	const drain = yield* SessionDrain;
	const domain = yield* AgentDomain;
	const fabric = yield* SessionFabric;
	const kernel = yield* Kernel;
	const waitForSiesta = (sessionId: string, intentId: string) =>
		kernel.changes(intentId).pipe(
			Stream.takeUntil(isTerminalIntentStatus),
			Stream.runLast,
			Effect.flatMap((status) => requireSiestaSucceeded(intentId, sessionId, status)),
		);
	const drainOpenSessions = Effect.fnUntraced(function* () {
		while (true) {
			const sessionIds = yield* drain.markActive();
			if (sessionIds.length === 0) {
				return;
			}
			const siestas = yield* kernel.active(domain.siesta);
			const drainSession = Effect.fnUntraced(function* (sessionId: string) {
				const current = siestas.filter((intent) => intent.payload.sessionId === sessionId);
				const intents = current.length > 0 ? current : [yield* kernel.submit(domain.siesta, { sessionId })];
				yield* Effect.forEach(intents, (intent) => waitForSiesta(sessionId, intent.id), { concurrency: "unbounded" });
			});
			yield* Effect.forEach(sessionIds, drainSession, {
				concurrency: "unbounded",
			});
		}
	});
	// A refused quit can leave the application running, so the drain always reopens Session starts.
	return yield* fabric.closeStarts().pipe(Effect.andThen(drainOpenSessions()), Effect.ensuring(fabric.reopenStarts()));
});
