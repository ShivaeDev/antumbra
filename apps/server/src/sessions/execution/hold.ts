import type { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect } from "effect";
export const holdOperation = Effect.fn("Sessions.holdOperation")(function* (id: SessionOperationId, detail: string) {
	const sessionsService = yield* Sessions;

	yield* sessionsService.hold({ requestId: Request.make(`${id}:held`), id, detail }).pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
