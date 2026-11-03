import { Message, type MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { MailWakeEvidence } from "@antumbra/platform-vocabulary/mail-evidence.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

export const all = Effect.fn("MailHistory.all")(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from antumbra.messages order by "sentAt", sent_order`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Message))),
	);
});
export const byId = Effect.fn("MailHistory.byId")(function* (id: MessageId) {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from antumbra.messages where id = ${id}`.pipe(
		Effect.flatMap((rows) => Schema.decodeUnknownEffect(Schema.NullOr(Message))(rows[0] ?? null)),
	);
});
export const wakeEvidence = Effect.fn("MailHistory.wakeEvidence")(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select evidence from antumbra.mail_wake_evidence where id = 1`.pipe(
		Effect.flatMap((rows) => Schema.decodeUnknownEffect(Schema.NullOr(MailWakeEvidence))(rows[0]?.evidence ?? null)),
	);
});
