import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Message, ROUTINE_MAIL_MINUTES } from "@antumbra/platform-vocabulary/mail.ts";
import { MailEvent } from "@antumbra/platform-vocabulary/mail-event.ts";
import { MailWakeEvidence } from "@antumbra/platform-vocabulary/mail-evidence.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { MailHistory } from "#postgres/mail/service.ts";

export const journalMail = Effect.fn("MailFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const entries = yield* source`select name, payload, requestId from journal
  where name in ('MessageSent', 'MessageDelivered', 'MessageRead') order by seq`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ name: Schema.String, payload: Schema.String, requestId: Request })))),
	);
	const events = yield* Effect.forEach(entries, (entry) =>
		Effect.gen(function* () {
			const payload = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)))(entry.payload);
			const value = yield* Schema.decodeUnknownEffect(MailEvent)({ ...payload, _tag: entry.name });
			return { requestId: entry.requestId, value };
		}),
	);
	const messages = yield* source`select * from message order by sentAt, rowid`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Message))),
	);
	const counts = yield* source`select count from count where scope = 'fleet' and key = 'routineMailMinutes'`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ count: Schema.Number })))),
	);
	const agents = yield* source`select id, status from agent order by rowid`;
	const sessions = yield* source`select id, agentId, status, executionStatus, parentSessionId, stoppedAt from session order by rowid`;
	const crew = yield* source`select agentId, voyageId from voyageAgent order by rowid`;
	const evidence = yield* Schema.decodeUnknownEffect(MailWakeEvidence)({
		quietMillis: (counts[0]?.count ?? ROUTINE_MAIL_MINUTES) * 60_000,
		agents,
		sessions,
		crew,
	});
	return { events, messages, evidence };
});
export const replayMailFixture = Effect.fn("MailFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalMail>>) {
	const history = yield* MailHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, event.value);
	yield* history.append(Request.make("fixture:mail-wake-evidence"), { _tag: "MailWakeObserved", ...snapshot.evidence });
	yield* history.rebuild();
	const actual = yield* history.all();
	if (!Schema.toEquivalence(Schema.Array(Message))(snapshot.messages, actual)) {
		return yield* Effect.fail(new MailFixtureMismatch({ message: "Mail history does not reproduce the captured journal rows" }));
	}
	return { messages: actual.length, events: snapshot.events.length + 1 };
});
export class MailFixtureMismatch extends Schema.TaggedError<MailFixtureMismatch>()("MailFixtureMismatch", { message: Schema.String }) {}
