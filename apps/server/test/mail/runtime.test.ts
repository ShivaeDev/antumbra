import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { mailWords } from "@antumbra/platform-prompts/mail.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { HAND, sending } from "#test/mail/kit.ts";
import { ROOT, working } from "#test/mail/resting.ts";

it.app("releasing a wake hold delivers due mail without marking it read", function* (app) {
	const runner = yield* working(app);
	yield* runner.rest(2);
	yield* app.api.settings.setFlag({ key: "holdWakes", on: true });
	yield* app.api.mail.send(sending("shoal"));
	expect((yield* answered(app.api.mail.dueWakes({}))).wakes).toHaveLength(1);
	expect(yield* answered(app.api.sessions.operations({ sessionId: ROOT }))).toEqual([]);
	yield* app.api.settings.setFlag({ key: "holdWakes", on: false });
	const delivered = yield* eventually(app.api.mail.mailbox({ agentId: HAND }), (mail) => mail.every((held) => held.deliveredAt !== null));
	expect(delivered.map((held) => held.readAt)).toEqual([null]);
	const operations = yield* answered(app.api.sessions.operations({ sessionId: ROOT }));
	expect(operations).toMatchObject([{ kind: "wake", reason: mailWords({ count: 1, precedence: "priority" }), status: "requested" }]);
	expect((yield* answered(app.api.mail.dueWakes({}))).wakes).toEqual([]);
});

it.app("a routine mail timer submits the wake when its quiet interval ends", function* (app) {
	const runner = yield* working(app);
	yield* runner.rest(2);
	yield* app.api.settings.setCount({ key: "routineMailMinutes", count: 1 });
	yield* app.api.mail.send({ ...sending("shoal"), precedence: "routine" });
	yield* app.clock.advance(55_000);
	expect(yield* answered(app.api.sessions.operations({ sessionId: ROOT }))).toEqual([]);
	yield* app.clock.advance(5_000);
	const delivered = yield* eventually(app.api.mail.mailbox({ agentId: HAND }), (mail) => mail.every((held) => held.deliveredAt !== null));
	expect(delivered[0]?.readAt).toBeNull();
});

it.app("new mail waits behind a requested wake then wakes the resting agent again", function* (app) {
	const runner = yield* working(app);
	yield* runner.rest(2);
	yield* app.api.mail.send(sending("shoal"));
	yield* eventually(app.api.mail.mailbox({ agentId: HAND }), (mail) => mail.every((held) => held.deliveredAt !== null));
	const first = (yield* answered(app.api.sessions.operations({ sessionId: ROOT })))[0];
	if (first === undefined) return yield* Effect.die("The first mail wake was not submitted");
	yield* app.api.mail.send(sending("channel"));
	expect(yield* answered(app.api.sessions.operations({ sessionId: ROOT }))).toHaveLength(1);
	expect((yield* answered(app.api.mail.unread({ agentId: HAND }))).filter((held) => held.deliveredAt === null)).toHaveLength(1);
	yield* runner.accept(3, first.id);
	yield* runner.rest(4);
	const next = yield* eventually(app.api.sessions.operations({ sessionId: ROOT }), (operations) => operations.length === 2);
	expect(next[1]?.reason).toBe(mailWords({ count: 2, precedence: "priority" }));
});
