import { BackendFailure } from "@antumbra/runner-ports/backend.ts";
import { Deferred, Effect } from "effect";
import { audit } from "#audit.ts";
import { RunnerLog } from "#log.ts";
import { RunnerIdentity } from "#ports.ts";
import type { Attachment, Opening } from "#state.ts";

export const confirm = Effect.fn("RunnerFabric.confirm")(function* (entry: Attachment, operation: Opening, nativeRef: string) {
	if (yield* Deferred.isDone(entry.opened)) return;
	const log = yield* RunnerLog;
	const identity = yield* RunnerIdentity;
	const { requestId, sessionId, options } = operation;
	if (operation.type === "Wake" && operation.nativeRef !== nativeRef) {
		const detail = "provider resumed a different native session";
		yield* log.append({ type: "SessionFailed", requestId, sessionId, reason: detail });
		return yield* new BackendFailure({ tag: options.backend, detail });
	}
	yield* log.append(
		operation.type === "Start"
			? {
					type: "SessionStarted",
					requestId,
					sessionId,
					agentId: options.agentId,
					backend: options.backend,
					cwd: options.cwd,
					nativeRef,
					toolSetVersion: options.toolSet.version,
					runnerId: identity.runnerId,
				}
			: { type: "SessionWoke", requestId, sessionId, runnerId: identity.runnerId },
	);
	if (operation.type === "Wake") yield* audit(entry, operation, nativeRef);
	yield* Deferred.succeed(entry.opened, nativeRef);
});
