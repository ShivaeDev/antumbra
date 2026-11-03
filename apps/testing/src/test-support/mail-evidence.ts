import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { journalMail } from "@antumbra/server-journal/postgres/mail/fixture.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { Effect } from "effect";
import type { journalComparison } from "#test-support/journal-comparison.ts";
import { captureJournal } from "#test-support/journal-replay.ts";

export const observeMailJournal = Effect.fn("PostgresApp.observeMailJournal")(function* (
	journal: Effect.Success<ReturnType<typeof journalComparison>>,
	requestId: Request,
) {
	const snapshot = yield* journalMail(yield* captureJournal(journal));
	const mail = yield* Mail;
	yield* mail.observeWake(requestId, snapshot.evidence);
	return snapshot;
});
