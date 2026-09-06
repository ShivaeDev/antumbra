import type { AgentBackend } from "@antumbra/plugin-api";
import type { AgentPrompt } from "@antumbra/prompts/mint.ts";
import { type EventSink, SessionFabric } from "@antumbra/session-fabric";
import { promptInput, type SinkFor } from "@antumbra/sessions";
import type { ResolvedAgentSettings } from "@antumbra/settings";
import { Deferred, Effect, Option } from "effect";
import { SmootherLifecycle } from "#smoothing/lifecycle/service.ts";
import { boundSummaryTool, endingSink, type SummaryWritten } from "#smoothing/summary-tool.ts";

const PATIENCE_MILLIS = 600_000;

const TIMED_OUT: SummaryWritten = { _tag: "timedOut" };

export interface SmootherSession {
	readonly agentId: string;
	readonly backend: AgentBackend;
	readonly cwd: string;
	readonly material: AgentPrompt;
	readonly orders: AgentPrompt;
	readonly settings: ResolvedAgentSettings;
}

export const makeSmootherSession = (sinkFor: SinkFor) =>
	Effect.gen(function* () {
		const fabric = yield* SessionFabric;
		const lifecycle = yield* SmootherLifecycle;
		const attach = (session: SmootherSession, sessionId: string, written: Deferred.Deferred<SummaryWritten>, sink: EventSink) =>
			fabric.withStartAdmission((permit) =>
				fabric.start(
					permit,
					session.agentId,
					session.backend,
					{
						constrainedPrompt: session.orders,
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
			yield* lifecycle.registerSession({ agentId: session.agentId, backend: session.backend.tag, cwd: session.cwd, sessionId });
			const sink = endingSink(yield* sinkFor(sessionId, session.backend.audit), written);
			return yield* attach(session, sessionId, written, sink).pipe(
				Effect.andThen(Deferred.await(written).pipe(Effect.timeoutOrElse({ duration: PATIENCE_MILLIS, orElse: () => Effect.succeed(TIMED_OUT) }))),
				Effect.onExit(() => lifecycle.closeSession(session.agentId, sessionId)),
			);
		});
	});
