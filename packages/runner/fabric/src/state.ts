import type { Operation, OperationResult } from "@antumbra/platform-runner/operations.ts";
import type { BackendFailure, SessionHandle } from "@antumbra/runner-ports/backend.ts";
import { type Deferred, Effect, Scope } from "effect";
import type { Activity } from "#activity.ts";
import { makeSessionStartAdmission } from "#admission.ts";

export type Opening = Extract<Operation, { type: "Start" | "Wake" }>;
export interface Attachment {
	readonly agentId: string;
	readonly scope: Scope.Closeable;
	readonly activity: Activity;
	readonly opened: Deferred.Deferred<string, BackendFailure>;
	handle: SessionHandle | undefined;
}
export interface State {
	readonly lifetime: Scope.Scope;
	readonly attachments: Map<string, Attachment>;
	readonly pending: Map<string, Deferred.Deferred<OperationResult>>;
	readonly admission: Effect.Success<typeof makeSessionStartAdmission>;
}
export const initialize = Effect.fn("RunnerFabric.initialize")(function* () {
	return {
		lifetime: yield* Scope.Scope,
		attachments: new Map<string, Attachment>(),
		pending: new Map<string, Deferred.Deferred<OperationResult>>(),
		admission: yield* makeSessionStartAdmission,
	} satisfies State;
})();
export const accepted: OperationResult = { type: "Accepted" };
export const refusal = (reason: string): OperationResult => ({ type: "Refused", reason });
export const attached = Effect.fn("RunnerFabric.attached")((state: State) => Effect.sync(() => new Set(state.attachments.keys())));
