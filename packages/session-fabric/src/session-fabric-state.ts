import { Effect, type Scope } from "effect";
import { makeSessionAttachmentRegistry } from "#session-attachment-registry.ts";
import { makeSessionLifecycles } from "#session-lifecycle.ts";
import { makeSessionStartAdmission } from "#session-start-admission.ts";

export interface SessionFabricState {
	readonly attachments: Effect.Success<typeof makeSessionAttachmentRegistry>;
	readonly lifecycles: Effect.Success<typeof makeSessionLifecycles>;
	readonly startAdmission: Effect.Success<typeof makeSessionStartAdmission>;
}

export const initializeSessionFabric = Effect.fn("sessionFabric.initialize")(function* (): Effect.fn.Return<SessionFabricState, never, Scope.Scope> {
	return {
		attachments: yield* makeSessionAttachmentRegistry,
		lifecycles: yield* makeSessionLifecycles,
		startAdmission: yield* makeSessionStartAdmission,
	};
})();
