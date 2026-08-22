import type { AgentBackend, DirectTool } from "@antumbra/plugin-api";
import type { AgentPrompt } from "@antumbra/prompts";
import {
	type SessionAttachment,
	SessionFabric,
} from "@antumbra/session-fabric";
import { Effect, Option } from "effect";
import { makeRefuseSubsessionAttach } from "#session-attach-roots.ts";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import { SessionRecoveryHeld } from "#session-recovery-error.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import type { SinkFor } from "#session-tree-sink.ts";

interface SessionResumeDeps {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly sinkFor: SinkFor;
	readonly toolsFor: (
		context: SessionRecoveryContext,
	) => ReadonlyArray<DirectTool>;
}

const admitRecoveredSession =
	(context: SessionRecoveryContext, instruction: AgentPrompt) =>
	(attachment: SessionAttachment) =>
		Effect.gen(function* () {
			const openedNativeRef = yield* attachment.openedNativeRef;
			if (openedNativeRef !== context.nativeRef) {
				return yield* new SessionRecoveryHeld({
					detail: `provider resumed native session ${openedNativeRef}, expected ${context.nativeRef}`,
				});
			}
			yield* attachment.handle.queue(instruction);
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
				const options = {
					cwd: context.cwd,
					resume: Option.some(context.nativeRef),
					sessionId: context.identity.sessionId,
					tools: deps.toolsFor(context),
				};
				return Effect.gen(function* () {
					yield* refuseSubsession(context.identity.sessionId);
					const sink = yield* deps.sinkFor(
						context.identity.sessionId,
						backend.audit,
					);
					yield* fabric.start(
						permit,
						context.identity.agentId,
						backend,
						options,
						sink,
						admitRecoveredSession(context, instruction),
					);
				}).pipe(
					Effect.catchTag("SessionAttachmentFailure", (failure) =>
						Effect.fail(new SessionRecoveryHeld({ detail: failure.detail })),
					),
					Effect.catchTag("SubsessionAttachRefused", (refused) =>
						Effect.fail(new SessionRecoveryHeld({ detail: refused.message })),
					),
				);
			},
		});
	});
