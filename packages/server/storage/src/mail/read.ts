import { Message, type MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

export const all = Effect.fn("MailHistory.all")(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from "message" order by "sentAt", sent_order`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Message))));
});
export const byId = Effect.fn("MailHistory.byId")(function* (id: MessageId) {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from "message" where id = ${id}`.pipe(
		Effect.flatMap((rows) => Schema.decodeUnknownEffect(Schema.NullOr(Message))(rows[0] ?? null)),
	);
});
