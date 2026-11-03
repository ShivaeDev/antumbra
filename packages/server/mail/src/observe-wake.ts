import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { MailWakeEvidence } from "@antumbra/platform-vocabulary/mail-evidence.ts";
import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { Effect, type Semaphore } from "effect";

export const observeWake = (serial: Semaphore.Semaphore) =>
	Effect.fn("Mail.observeWake")(function* (requestId: Request, evidence: typeof MailWakeEvidence.Type) {
		const history = yield* MailHistory;
		return yield* history.append(requestId, { _tag: "MailWakeObserved", ...evidence });
	}, serial.withPermit);
