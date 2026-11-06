import type { OperationResult } from "@antumbra/platform-runner/operations.ts";
import { type Deferred, Effect, Scope } from "effect";
import { makeSessionStartAdmission } from "#admission.ts";
import type { Attachment, State } from "#state.ts";

export const initialize = Effect.fn("RunnerFabric.initialize")(function* () {
	return {
		lifetime: yield* Scope.Scope,
		attachments: new Map<string, Attachment>(),
		pending: new Map<string, Deferred.Deferred<OperationResult>>(),
		admission: yield* makeSessionStartAdmission,
	} satisfies State;
})();
