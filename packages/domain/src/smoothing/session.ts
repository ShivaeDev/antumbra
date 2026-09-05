import { Database } from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
import { type AgentPrompt, smootherWords } from "@antumbra/prompts";
import { type EventSink, SessionFabric } from "@antumbra/session-fabric";
import { promptInput, type SinkFor } from "@antumbra/sessions";
import { SessionRegistration } from "@antumbra/sessions/registration/service";
import type { ResolvedAgentSettings } from "@antumbra/settings";
import { Deferred, Effect, Option } from "effect";
import { boundSummaryTool, endingSink, type SummaryWritten } from "#smoothing/summary-tool.ts";

const PATIENCE_MILLIS = 600_000;

const TIMED_OUT: SummaryWritten = { _tag: "timedOut" };

export interface SmootherSession {
	readonly agentId: string;
	readonly backend: AgentBackend;
	readonly cwd: string;
	readonly material: AgentPrompt;
	readonly settings: ResolvedAgentSettings;
}

export const makeSmootherSession = (sinkFor: SinkFor) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const fabric = yield* SessionFabric;
		const registration = yield* SessionRegistration;
		const closeSession = (agentId: string, sessionId: string) =>
			Effect.gen(function* () {
				yield* fabric.stop(sessionId);
				yield* db.AgentSession.where({ id: sessionId, status: "open" }).update({ status: "closed" });
				yield* db.Agent.where({ currentSessionId: sessionId, id: agentId }).update({ currentSessionId: null });
			});
		const attach = (session: SmootherSession, sessionId: string, written: Deferred.Deferred<SummaryWritten>, sink: EventSink) =>
			fabric.withStartAdmission((permit) =>
				fabric.start(
					permit,
					session.agentId,
					session.backend,
					{
						constrainedPrompt: smootherWords,
						cwd: session.cwd,
						effort: Option.fromUndefinedOr(session.settings.effort),
						model: Option.fromUndefinedOr(session.settings.model),
						resume: Option.none(),
						sessionId,
						tools: [boundSummaryTool(written)],
					},
					sink,
					(attachment) => attachment.handle.queue(promptInput(session.material)),
				),
			);
		return Effect.fn("Smoothing.pass")(function* (session: SmootherSession) {
			const sessionId = crypto.randomUUID();
			const written = yield* Deferred.make<SummaryWritten>();
			yield* db.Agent.where({ id: session.agentId }).update({ currentSessionId: sessionId });
			yield* registration.ensureRoot({ agentId: session.agentId, backend: session.backend.tag, sessionId }, session.cwd);
			const sink = endingSink(yield* sinkFor(sessionId, session.backend.audit), written);
			return yield* attach(session, sessionId, written, sink).pipe(
				Effect.andThen(Deferred.await(written).pipe(Effect.timeoutOrElse({ duration: PATIENCE_MILLIS, orElse: () => Effect.succeed(TIMED_OUT) }))),
				Effect.onExit(() => closeSession(session.agentId, sessionId)),
			);
		});
	});
