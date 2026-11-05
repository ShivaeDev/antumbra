import { Message } from "@antumbra/platform-vocabulary/mail.ts";
import type { MailEvent } from "@antumbra/platform-vocabulary/mail-event.ts";
import { invalidationKeys } from "@shivaedev/changes/keys.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { byId } from "#mail/read.ts";

export const apply = Effect.fn("MailHistory.apply")(function* ({
	value,
	streamVersion,
}: {
	readonly value: typeof MailEvent.Type;
	readonly streamVersion: number;
}) {
	const sql = yield* SqlClient.SqlClient;
	if (value._tag === "MessageSent") {
		const { _tag, ...sent } = value;
		const row = Message.make({ ...sent, deliveredAt: null, readAt: null });
		yield* sql`insert into "message" ${sql.insert({ ...row, sent_order: streamVersion })}`;
		yield* invalidateOnCommit([
			"message",
			...invalidationKeys([{ _tag: "Bucket", collection: "message", field: "toAgentId", value: value.toAgentId }]),
		]);
	} else {
		const patch = value._tag === "MessageDelivered" ? { deliveredAt: value.deliveredAt } : { readAt: value.readAt };
		for (const id of value.ids) {
			const row = yield* byId(id);
			yield* sql`update "message" set ${sql.update(patch)} where id = ${id}`;
			yield* invalidateOnCommit(
				row === null
					? ["message"]
					: ["message", ...invalidationKeys([{ _tag: "Bucket", collection: "message", field: "toAgentId", value: row.toAgentId }])],
			);
		}
	}
});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "message"`;
	yield* invalidateOnCommit(["message", "agent", "session", "sessionOperation", "count", "voyageAgent"]);
});
