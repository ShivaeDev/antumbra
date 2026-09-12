import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";
import { HAND, messageOf, sending } from "#test/kit.ts";
import { ROOT, sessionEvidence, working } from "#test/resting.ts";

it.app("priority mail waits for active work to rest without being marked read", function* (app) {
	yield* working(app);
	yield* app.api.mail.send(sending("shoal"));
	expect(yield* answered(app.api.mail.dueWakes({}))).toEqual([]);
	yield* sessionEvidence(2, { type: "activity", state: "idle" });
	expect(yield* answered(app.api.mail.dueWakes({}))).toMatchObject([
		{ agentId: HAND, sessionId: ROOT, batch: { count: 1, precedence: "priority" }, unreadIds: [messageOf("shoal")] },
	]);
	expect((yield* answered(app.api.mail.unread({ agentId: HAND })))[0]).toMatchObject({ readAt: null, deliveredAt: null });
});

it.app("routine mail waits for its threshold and includes earlier unread mail in the batch", function* (app) {
	yield* working(app);
	yield* sessionEvidence(2, { type: "activity", state: "idle" });
	yield* app.api.mail.send({ ...sending("old"), precedence: "flash" });
	yield* app.api.mail.markDelivered({ agentId: HAND, ids: [messageOf("old")] });
	yield* app.clock.advance(60_000);
	yield* app.api.mail.send({ ...sending("new"), precedence: "routine" });
	expect(yield* answered(app.api.mail.dueWakes({}))).toEqual([]);
	yield* app.clock.advance(300_000);
	expect(yield* answered(app.api.mail.dueWakes({}))).toMatchObject([{ batch: { count: 2, precedence: "flash" }, waitedMillis: 360_000 }]);
	yield* app.api.mail.markDelivered({ agentId: HAND, ids: [messageOf("old"), messageOf("new")] });
	expect(yield* answered(app.api.mail.dueWakes({}))).toEqual([]);
});
