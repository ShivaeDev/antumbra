import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { HAND, MATE, messageOf, sending } from "#test/kit.ts";

it.app("mail marked delivered then read leaves the unread mail and stays in the mailbox", function* (app) {
	yield* app.api.mail.send(sending("eastern approach"));
	const ids = [messageOf("eastern approach")];

	yield* app.api.mail.markDelivered({ agentId: HAND, ids });
	const carried = yield* answered(app.api.mail.unread({ agentId: HAND }));
	expect(carried.map((held) => held.id)).toEqual(ids);
	expect(carried[0]?.deliveredAt).not.toBeNull();

	yield* app.api.mail.markRead({ agentId: HAND, ids });
	expect(yield* answered(app.api.mail.unread({ agentId: HAND }))).toEqual([]);
	expect((yield* answered(app.api.mail.mailbox({ agentId: HAND }))).map((held) => held.id)).toEqual(ids);
});

it.app("refuses to mark mail addressed to another agent", function* (app) {
	yield* app.api.mail.send(sending("eastern approach", MATE));

	const refused = yield* Effect.flip(app.api.mail.markRead({ agentId: HAND, ids: [messageOf("eastern approach")] }));

	expect(refused).toMatchObject({ _tag: "NotAddressed", id: messageOf("eastern approach") });
	expect(yield* answered(app.api.mail.unread({ agentId: MATE }))).toHaveLength(1);
});
