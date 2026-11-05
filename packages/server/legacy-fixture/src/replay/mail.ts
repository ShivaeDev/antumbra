import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Message } from "@antumbra/platform-vocabulary/mail.ts";
import { MailEvent } from "@antumbra/platform-vocabulary/mail-event.ts";
import { MailHistory } from "@antumbra/server-storage/mail/service.ts";
import { Effect, Schema } from "effect";
import { LegacySource } from "#source.ts";

export const journalMail = Effect.fn("MailFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
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
	return { events, messages };
});
export const replayMailFixture = Effect.fn("MailFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalMail>>) {
	const history = yield* MailHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, event.value);
	const actual = yield* history.all();
	if (!Schema.toEquivalence(Schema.Array(Message))(snapshot.messages, actual)) {
		return yield* Effect.fail(new MailFixtureMismatch({ message: "Mail history does not reproduce the captured journal rows" }));
	}
	return { messages: actual.length, events: snapshot.events.length };
});
export class MailFixtureMismatch extends Schema.TaggedError<MailFixtureMismatch>()("MailFixtureMismatch", { message: Schema.String }) {}
