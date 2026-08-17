import type { AgentBackend, DirectTool } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { type SessionAttachment, SessionFabric } from "#fabric.ts";
import type { EventSink } from "#session-attachment.ts";
import { RECOVERY_INSTRUCTION } from "#session-recovery.ts";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import { SessionRecoveryHeld } from "#session-recovery-error.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";

interface SessionResumeDeps {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly sinkFor: (sessionId: string) => Effect.Effect<EventSink>;
	readonly toolsFor: (
		context: SessionRecoveryContext,
	) => ReadonlyArray<DirectTool>;
}

const admitRecoveredSession =
	(context: SessionRecoveryContext) => (attachment: SessionAttachment) =>
		Effect.gen(function* () {
			const openedNativeRef = yield* attachment.openedNativeRef;
			if (openedNativeRef !== context.nativeRef) {
				return yield* new SessionRecoveryHeld({
					detail: `provider resumed native session ${openedNativeRef}, expected ${context.nativeRef}`,
				});
			}
			yield* attachment.handle.queue(RECOVERY_INSTRUCTION);
		});

export const makeSessionRecoveryRuntime = (deps: SessionResumeDeps) =>
	Effect.gen(function* () {
		const fabric = yield* SessionFabric;
		return SessionRecoveryRuntime.of({
			resume: (permit, context) => {
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
					const sink = yield* deps.sinkFor(context.identity.sessionId);
					yield* fabric.start(
						permit,
						backend,
						options,
						sink,
						admitRecoveredSession(context),
					);
				}).pipe(
					Effect.catchTag("SessionAttachmentFailure", (failure) =>
						Effect.fail(new SessionRecoveryHeld({ detail: failure.detail })),
					),
				);
			},
		});
	});
