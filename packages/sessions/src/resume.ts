import type { AgentBackend, DirectTool, SessionInput } from "@antumbra/plugin-api";
import { type SessionAttachment, SessionFabric } from "@antumbra/session-fabric";
import { Effect, Option } from "effect";
import { makeRefuseSubsessionAttach } from "#attach-roots.ts";
import type { SessionRecoveryContext } from "#recovery/context.ts";
import { SessionRecoveryHeld } from "#recovery/error.ts";
import { SessionRecoveryRuntime } from "#recovery/runtime.ts";
import type { SinkFor } from "#tree/sink.ts";

interface SessionResumeDeps {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly sinkFor: SinkFor;
	readonly toolsFor: (context: SessionRecoveryContext) => Effect.Effect<ReadonlyArray<DirectTool>>;
}

const admitRecoveredSession = (context: SessionRecoveryContext, instruction: SessionInput) => (attachment: SessionAttachment) =>
	Effect.gen(function* () {
		// Some providers announce resumed identity only after first input; a mismatched conversation is refused immediately afterward.
		yield* attachment.handle.queue(instruction);
		const openedNativeRef = yield* attachment.openedNativeRef;
		if (openedNativeRef !== context.nativeRef) {
			return yield* new SessionRecoveryHeld({
				detail: `provider resumed native session ${openedNativeRef}, expected ${context.nativeRef}`,
			});
		}
	});

export const makeSessionRecoveryRuntime = (deps: SessionResumeDeps) =>
	Effect.gen(function* () {
		const fabric = yield* SessionFabric;
		const refuseSubsession = yield* makeRefuseSubsessionAttach;
		return SessionRecoveryRuntime.of({
			resume: (permit, context, instruction) => {
				const backend = deps.backends.get(context.backend);
				if (backend === undefined) {
					return Effect.fail(
						new SessionRecoveryHeld({
							detail: `agent backend ${context.backend} is not available`,
						}),
					);
				}
				return Effect.gen(function* () {
					yield* refuseSubsession(context.identity.sessionId);
					const sink = yield* deps.sinkFor(context.identity.sessionId, backend.audit);
					yield* fabric.start(
						permit,
						context.identity.agentId,
						backend,
						{
							cwd: context.cwd,
							resume: Option.some(context.nativeRef),
							sessionId: context.identity.sessionId,
							tools: yield* deps.toolsFor(context),
						},
						sink,
						admitRecoveredSession(context, instruction),
					);
				}).pipe(
					Effect.catchTag("SessionAttachmentFailure", (failure) => Effect.fail(new SessionRecoveryHeld({ detail: failure.detail }))),
					Effect.catchTag("SubsessionAttachRefused", (refused) => Effect.fail(new SessionRecoveryHeld({ detail: refused.message }))),
				);
			},
		});
	});
