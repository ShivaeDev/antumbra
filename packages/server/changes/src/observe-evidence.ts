import type { ChangeEvidence } from "@antumbra/platform-vocabulary/changes-event.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const observeEvidence = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.observeEvidence")(function* (requestId: Request, evidence: typeof ChangeEvidence.Type) {
		return yield* (yield* ChangesHistory).append(requestId, [{ _tag: "ChangeEvidenceObserved", ...evidence, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
