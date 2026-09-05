import type { SessionInput } from "@antumbra/plugin-api";
import { SessionFabric, type SessionStartPermit } from "@antumbra/session-fabric";
import { Effect, Option } from "effect";
import { makeRefuseSubsessionAttach } from "#attach-roots.ts";
import { admitRecoveredSession } from "#recovery/admit.ts";
import type { SessionRecoveryContext } from "#recovery/context.ts";
import { SessionRecoveryHeld } from "#recovery/error.ts";
import { RecoveryOptions } from "#recovery/options.ts";

export const resumeSession = Effect.fn("SessionRecoveryRuntime.resume")(
	function* (permit: SessionStartPermit, context: SessionRecoveryContext, instruction: SessionInput) {
		const options = yield* RecoveryOptions;
		const backend = options.backends.get(context.backend);
		if (backend === undefined) {
			return yield* new SessionRecoveryHeld({ detail: `agent backend ${context.backend} is not available` });
		}
		const fabric = yield* SessionFabric;
		const refuseSubsession = yield* makeRefuseSubsessionAttach;
		yield* refuseSubsession(context.identity.sessionId);
		const sink = yield* options.sinkFor(context.identity.sessionId, backend.audit);
		const settings = yield* options.settingsFor(context);
		yield* fabric.start(
			permit,
			context.identity.agentId,
			backend,
			{
				cwd: context.cwd,
				...settings,
				resume: Option.some(context.nativeRef),
				sessionId: context.identity.sessionId,
				tools: yield* options.toolsFor(context),
			},
			sink,
			admitRecoveredSession(context, instruction),
		);
	},
	Effect.catchTag("SessionAttachmentFailure", (failure) => Effect.fail(new SessionRecoveryHeld({ detail: failure.detail }))),
	Effect.catchTag("SubsessionAttachRefused", (refused) => Effect.fail(new SessionRecoveryHeld({ detail: refused.message }))),
);
