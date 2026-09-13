import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { mailWords } from "@antumbra/platform-prompts/mail.ts";
import { expect } from "vitest";
import { sending } from "#test/mail/kit.ts";
import { ROOT, working } from "#test/mail/resting.ts";

it.app("flash mail waits on the flash switch and wakes the agent when it goes back on", function* (app) {
	const runner = yield* working(app);
	yield* runner.rest(2);
	yield* app.api.settings.setFlag({ key: "wakeOnFlashMail", on: false });
	yield* app.api.mail.send({ ...sending("shoal"), precedence: "flash" });
	expect((yield* answered(app.api.mail.dueWakes({}), "the due wakes to be listed")).wakes).toHaveLength(1);
	expect(yield* answered(app.api.sessions.operations({ sessionId: ROOT }), "the session's operations to be listed")).toEqual([]);
	yield* app.api.settings.setFlag({ key: "wakeOnFlashMail", on: true });
	const woken = yield* eventually(app.api.sessions.operations({ sessionId: ROOT }), (operations) => operations.length === 1, "one operation");
	expect(woken).toMatchObject([{ kind: "wake", reason: mailWords({ count: 1, precedence: "flash" }), status: "requested" }]);
});

it.app("routine mail waits on the routine switch after its quiet window", function* (app) {
	const runner = yield* working(app);
	yield* runner.rest(2);
	yield* app.api.settings.setCount({ key: "routineMailMinutes", count: 1 });
	yield* app.api.settings.setFlag({ key: "wakeOnRoutineMail", on: false });
	yield* app.api.mail.send({ ...sending("shoal"), precedence: "routine" });
	yield* app.clock.advance(60_000);
	expect((yield* answered(app.api.mail.dueWakes({}), "the due wakes to be listed")).wakes).toHaveLength(1);
	expect(yield* answered(app.api.sessions.operations({ sessionId: ROOT }), "the session's operations to be listed")).toEqual([]);
	yield* app.api.settings.setFlag({ key: "wakeOnRoutineMail", on: true });
	const woken = yield* eventually(app.api.sessions.operations({ sessionId: ROOT }), (operations) => operations.length === 1, "one operation");
	expect(woken).toMatchObject([{ reason: mailWords({ count: 1, precedence: "routine" }) }]);
});

it.app("priority mail still wakes the agent while the flash and routine switches are off", function* (app) {
	const runner = yield* working(app);
	yield* runner.rest(2);
	yield* app.api.settings.setFlag({ key: "wakeOnFlashMail", on: false });
	yield* app.api.settings.setFlag({ key: "wakeOnRoutineMail", on: false });
	yield* app.api.mail.send(sending("shoal"));
	const woken = yield* eventually(app.api.sessions.operations({ sessionId: ROOT }), (operations) => operations.length === 1, "one operation");
	expect(woken).toMatchObject([{ reason: mailWords({ count: 1, precedence: "priority" }) }]);
});
