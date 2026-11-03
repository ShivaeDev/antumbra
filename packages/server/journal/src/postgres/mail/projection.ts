import { Message } from "@antumbra/platform-vocabulary/mail.ts";
import type { MailEvent } from "@antumbra/platform-vocabulary/mail-event.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { byId } from "#postgres/mail/read.ts";

export const apply = Effect.fn("MailHistory.apply")(function* ({
	value,
	streamVersion,
}: {
	readonly value: typeof MailEvent.Type;
	readonly streamVersion: number;
}) {
	const sql = yield* SqlClient.SqlClient;
	if (value._tag === "MailWakeObserved") {
		const { _tag, ...evidence } = value;
		yield* sql`insert into antumbra.mail_wake_evidence (id, evidence) values (1, ${JSON.stringify(evidence)}::jsonb)
   on conflict (id) do update set evidence = excluded.evidence`;
		yield* invalidateOnCommit(["agent", "session", "sessionOperation", "count", "voyageAgent"]);
	} else if (value._tag === "MessageSent") {
		const { _tag, ...sent } = value;
		const row = Message.make({ ...sent, deliveredAt: null, readAt: null });
		yield* sql`insert into antumbra.messages ${sql.insert({ ...row, sent_order: streamVersion })}`;
		yield* invalidateOnCommit(["message", `message:${value.toAgentId}`]);
	} else {
		const patch = value._tag === "MessageDelivered" ? { deliveredAt: value.deliveredAt } : { readAt: value.readAt };
		for (const id of value.ids) {
			const row = yield* byId(id);
			yield* sql`update antumbra.messages set ${sql.update(patch)} where id = ${id}`;
			yield* invalidateOnCommit(row === null ? ["message"] : ["message", `message:${row.toAgentId}`]);
		}
	}
});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra.messages`;
	yield* sql`delete from antumbra.mail_wake_evidence`;
	yield* invalidateOnCommit(["message", "agent", "session", "sessionOperation", "count", "voyageAgent"]);
});
