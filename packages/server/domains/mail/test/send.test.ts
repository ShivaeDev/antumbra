import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { HAND, messageOf, sending } from "#test/kit.ts";

it.app("sent mail waits unread and undelivered in the order it was sent", function* (app) {
	yield* app.api.mail.send(sending("eastern approach"));
	yield* app.clock.advance(60_000);
	yield* app.api.mail.send(sending("northern channel"));

	const waiting = yield* answered(app.api.mail.unread({ agentId: HAND }));
	expect(waiting.map((held) => held.id)).toEqual([messageOf("eastern approach"), messageOf("northern channel")]);
	expect(waiting[0]).toMatchObject({ authorAgentId: null, deliveredAt: null, precedence: "priority", readAt: null, toAgentId: HAND });
});

it.app("sends one message however often the request that named it arrives", function* (app) {
	const first = yield* app.api.mail.send(sending("eastern approach"));
	const again = yield* app.api.mail.send({ ...sending("eastern approach"), body: "a later sounding" });

	expect(again).toBe(first);
	expect(yield* app.rows.message.count({})).toBe(1);
	expect((yield* answered(app.api.mail.unread({ agentId: HAND })))[0]?.body).toBe(sending("eastern approach").body);
});

it.app("refuses a message with nothing said in it and stores nothing", function* (app) {
	const refused = yield* Effect.flip(app.api.mail.send({ ...sending("eastern approach"), body: "   " }));

	expect(refused).toMatchObject({ _tag: "Blank", field: "body" });
	expect(yield* app.rows.message.count({})).toBe(0);
});
